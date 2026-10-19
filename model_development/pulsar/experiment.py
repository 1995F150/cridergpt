"""Explicit bounded offline LoRA experiment; never changes a serving registry.

Use the existing .venv-inference-compat environment (PEFT 0.17.1).
All checkpoints are append-only. Evaluation is never used as training input.
"""
import os
os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', TOKENIZERS_PARALLELISM='false')
import argparse
import hashlib
import json
import math
import random
import resource
import time
from datetime import datetime, timezone
from pathlib import Path

from benchmark import SYSTEM, FirstToken, grade, hashfile
from plan import encode_example
from prepare_data import validate

P = Path(__file__).resolve().parent

def load_data(config, tokenizer, data_dir=P):
    manifest = json.loads((data_dir / 'data-manifest.json').read_text())
    splits = {}
    for split in ('train', 'validation'):
        path = data_dir / (split + '.jsonl')
        if hashfile(path) != manifest['sha256'][split]:
            raise ValueError('Dataset hash mismatch')
        splits[split] = [json.loads(line) for line in path.read_text().splitlines()]
    validate(splits, json.loads((P / 'eval_cases.json').read_text()))
    validate(splits, json.loads((P / 'fresh_cases.json').read_text()))
    if hashfile(P / 'eval_cases.json') != manifest['eval_sha256']:
        raise ValueError('Evaluation hash mismatch')
    return {name: [encode_example(tokenizer, [{'role': 'system', 'content': SYSTEM}, *row['messages']], 256)
                   for row in rows] for name, rows in splits.items()}, manifest

def evaluate(model, tokenizer, cases, inference):
    import torch
    model.eval()
    rows = []
    for case in cases:
        messages = [{'role': 'system', 'content': SYSTEM}, *case['messages']]
        inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True,
                                               return_tensors='pt', return_dict=True)
        count = inputs['input_ids'].shape[1]
        if count + inference['max_new_tokens'] > inference['context_budget']:
            raise ValueError('Context budget exceeded')
        stream = FirstToken()
        tick = time.monotonic()
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=inference['max_new_tokens'],
                                    max_time=inference['max_time_seconds'], do_sample=False,
                                    pad_token_id=tokenizer.eos_token_id, streamer=stream, use_cache=True)
        elapsed = time.monotonic() - tick
        tokens = output[0, count:]
        text = tokenizer.decode(tokens, skip_special_tokens=True)
        eos = model.generation_config.eos_token_id
        eos = [eos] if isinstance(eos, int) else eos or [tokenizer.eos_token_id]
        finish = 'eos' if len(tokens) and tokens[-1].item() in eos else 'token_limit' if len(tokens) >= inference['max_new_tokens'] else 'time_limit'
        rows.append(dict(id=case['id'], response=text, passed=grade(case, text), finish_reason=finish,
                         input_tokens=count, output_tokens=len(tokens), seconds=elapsed,
                         tokens_per_second=len(tokens)/elapsed,
                         ttft_seconds=stream.time-tick if stream.time else None,
                         prompt_sha256=hashlib.sha256(json.dumps(messages, sort_keys=True).encode()).hexdigest(),
                         response_sha256=hashlib.sha256(text.encode()).hexdigest()))
    return dict(passed=sum(row['passed'] for row in rows), total=len(rows), results=rows)

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--calibrate', action='store_true')
    group.add_argument('--train', action='store_true')
    parser.add_argument('--steps', type=int, default=10)
    parser.add_argument('--data-dir', type=Path, default=P)
    parser.add_argument('--initial-adapter', type=Path)
    parser.add_argument('--learning-rate', type=float, default=1e-4)
    parser.add_argument('--calibration-output', type=Path)
    args = parser.parse_args()
    if not 1 <= args.steps <= 50:
        raise ValueError('Pilot is limited to 1–50 optimizer steps')
    if not 0 < args.learning_rate <= 3e-4:
        raise ValueError('Learning rate exceeds the bounded experiment range')
    import torch
    import transformers
    import peft
    from transformers import AutoTokenizer, AutoModelForCausalLM, set_seed
    from peft import LoraConfig, TaskType, get_peft_model, PeftModel
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    set_seed(611)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    config = json.loads((P / 'config.json').read_text())
    base = Path(config['base']['path'])
    if hashfile(base / 'model.safetensors') != config['base']['weights_sha256']:
        raise ValueError('Pinned weights mismatch')
    tokenizer = AutoTokenizer.from_pretrained(base, local_files_only=True, trust_remote_code=False)
    data, manifest = load_data(config, tokenizer, args.data_dir)
    model = AutoModelForCausalLM.from_pretrained(base, local_files_only=True, trust_remote_code=False,
                                                torch_dtype=torch.float32, attn_implementation='eager')
    if args.initial_adapter:
        initial_adapter_sha = hashfile(args.initial_adapter/'adapter_model.safetensors')
        model = PeftModel.from_pretrained(model, args.initial_adapter, is_trainable=True, local_files_only=True)
    else:
        initial_adapter_sha = None
        model = get_peft_model(model, LoraConfig(task_type=TaskType.CAUSAL_LM, r=8, lora_alpha=16,
                                               target_modules=['q_proj', 'v_proj'], lora_dropout=0, bias='none'))
    trainable = [p for p in model.parameters() if p.requires_grad]
    assert sum(p.numel() for p in trainable) == 460800
    def tensors(row):
        return {key: torch.tensor([values]) for key, values in row.items()}
    def validation_loss():
        model.eval()
        with torch.inference_mode():
            values = [model(**tensors(row)).loss.item() for row in data['validation']]
        if not all(math.isfinite(x) for x in values):
            raise ValueError('Non-finite validation loss')
        return sum(values)/len(values)
    # Calibrate the longest microbatch; do not update weights in this mode.
    model.train()
    tick = time.monotonic()
    loss = model(**tensors(max(data['train'], key=lambda row: len(row['input_ids'])))).loss
    loss.backward()
    assert torch.isfinite(loss)
    model.zero_grad(set_to_none=True)
    calibration_seconds = time.monotonic()-tick
    estimate = calibration_seconds * 4 * args.steps * 1.5
    calibration = dict(microbatch_seconds=calibration_seconds, estimated_training_seconds=estimate,
                       optimizer_steps=args.steps, accumulation=4, memory_limit_gib=4,
                       peak_process_rss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,
                       wall_limit_seconds=900, optimizer_updates_performed=False)
    print(json.dumps({'calibration': calibration}), flush=True)
    if args.calibrate:
        destination = args.calibration_output or P/'runs'/('calibration-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.json')
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('x') as stream:
            json.dump(calibration, stream, indent=2)
            stream.write('\n')
        return
    if estimate > 900:
        raise ValueError('Calibration exceeds the 15-minute training budget; reduce steps')
    run = P / 'runs' / ('pilot-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    run.mkdir(parents=True, mode=0o700, exist_ok=False)
    (run / 'data-manifest.json').write_text(json.dumps(manifest, indent=2))
    source_sha = hashfile(Path(__file__))
    before_loss = validation_loss()
    original_cases = json.loads((P / 'eval_cases.json').read_text())
    before = evaluate(model, tokenizer, original_cases, config['inference'])
    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=0, foreach=False)
    model.train()
    model.config.use_cache = False
    rng = random.Random(611)
    order = list(range(len(data['train'])))
    rng.shuffle(order)
    cursor = 0
    started = time.monotonic()
    completed = 0
    logs = []
    for step in range(1, args.steps+1):
        if time.monotonic()-started >= 900:
            break
        optimizer.zero_grad(set_to_none=True)
        losses = []
        for _ in range(4):
            if cursor == len(order):
                rng.shuffle(order)
                cursor = 0
            item = data['train'][order[cursor]]
            cursor += 1
            loss = model(**tensors(item)).loss
            if not torch.isfinite(loss):
                raise ValueError('Non-finite training loss')
            (loss/4).backward()
            losses.append(loss.item())
        if any(p.grad is not None and not torch.isfinite(p.grad).all() for p in trainable):
            raise ValueError('Non-finite gradient')
        assert all(p.grad is None for p in model.parameters() if not p.requires_grad)
        norm = torch.nn.utils.clip_grad_norm_(trainable, 1.0).item()
        optimizer.step()
        completed = step
        row = dict(step=step, loss=sum(losses)/4, gradient_norm=norm,
                   elapsed_seconds=time.monotonic()-started)
        logs.append(row)
        print(json.dumps(row), flush=True)
        if step % 10 == 0 or step == args.steps:
            dest = run / f'adapter-step-{step}'
            dest.mkdir(exist_ok=False)
            model.save_pretrained(dest, safe_serialization=True)
            tokenizer.save_pretrained(dest)
            torch.save({'optimizer': optimizer.state_dict(), 'step': step, 'order': order,
                        'cursor': cursor, 'python_rng': rng.getstate(), 'torch_rng': torch.get_rng_state()}, dest / 'optimizer.pt')
    training_seconds = time.monotonic()-started
    optimizer.zero_grad(set_to_none=True)
    model.config.use_cache = True
    after_loss = validation_loss()
    after = evaluate(model, tokenizer, original_cases, config['inference'])
    assert hashfile(base / 'model.safetensors') == config['base']['weights_sha256']
    load_data(config, tokenizer, args.data_dir)
    if args.initial_adapter:
        assert hashfile(args.initial_adapter/'adapter_model.safetensors') == initial_adapter_sha
    report = dict(run=str(run), base_sha256=config['base']['weights_sha256'],
                  dataset_sha256=manifest['sha256'], eval_sha256=hashfile(P/'eval_cases.json'),
                  evaluator_sha256=source_sha, grader_sha256=hashfile(P/'benchmark.py'),
                  initial_adapter_sha256=initial_adapter_sha, learning_rate=args.learning_rate,
                  dataset_directory=str(args.data_dir.resolve()),
                  runtime=dict(torch=torch.__version__, transformers=transformers.__version__, peft=peft.__version__),
                  system_prompt=SYSTEM, inference=config['inference'], calibration=calibration,
                  completed_steps=completed, training_seconds=training_seconds,
                  validation_loss_before=before_loss, validation_loss_after=after_loss,
                  before=before, after=after, training_log=logs,
                  original_weights_unchanged=True, deployed=False, production_ready=False,
                  caveat='Development smoke checks are known; not a blind generalization benchmark. No evaluator rows used for training.')
    (run/'report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({'report':str(run/'report.json'), 'before':before['passed'], 'after':after['passed'], 'total':after['total']}), flush=True)

if __name__ == '__main__':
    main()
