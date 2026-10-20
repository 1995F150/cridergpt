"""Reproduce disjoint base/adapter evaluations; does not train or select checkpoints."""
import argparse
import json
from pathlib import Path
from experiment import P, evaluate
from benchmark import hashfile
from prepare_data import validate

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--adapter',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--cases',type=Path,default=P/'fresh_cases.json')
    parser.add_argument('--system-file',type=Path)
    parser.add_argument('--training-data-dir',type=Path,default=P)
    args=parser.parse_args()
    import experiment
    if args.system_file:
        experiment.SYSTEM=args.system_file.read_text().strip()
    import torch
    import transformers
    from transformers import AutoTokenizer,AutoModelForCausalLM,set_seed
    from peft import PeftModel
    torch.set_num_threads(2);torch.set_num_interop_threads(1);set_seed(611)
    config=json.loads((P/'config.json').read_text());base=Path(config['base']['path'])
    assert hashfile(base/'model.safetensors')==config['base']['weights_sha256']
    cases=json.loads(args.cases.read_text())
    manifest=json.loads((args.training_data_dir/'data-manifest.json').read_text())
    splits={}
    for split in ['train','validation']:
        path=args.training_data_dir/(split+'.jsonl')
        if hashfile(path)!=manifest['sha256'][split]:raise ValueError('Training data checksum mismatch')
        splits[split]=[json.loads(line) for line in path.read_text().splitlines()]
    validate(splits,cases)
    tok=AutoTokenizer.from_pretrained(base,local_files_only=True,trust_remote_code=False)
    model=AutoModelForCausalLM.from_pretrained(base,local_files_only=True,trust_remote_code=False,torch_dtype=torch.float32,attn_implementation='eager')
    before=evaluate(model,tok,cases,config['inference'])
    model=PeftModel.from_pretrained(model,args.adapter,local_files_only=True,is_trainable=False)
    after=evaluate(model,tok,cases,config['inference'])
    report=dict(eval_sha256=hashfile(args.cases),adapter_sha256=hashfile(args.adapter/'adapter_model.safetensors'),
                system_prompt=experiment.SYSTEM, system_sha256=__import__('hashlib').sha256(experiment.SYSTEM.encode()).hexdigest(),
                training_data_sha256=manifest['sha256'],evaluator_sha256=hashfile(Path(__file__)),
                base_sha256=config['base']['weights_sha256'],before=before,after=after,
                torch=torch.__version__,transformers=transformers.__version__,deployed=False,
                caveat='Fresh exact-prompt-disjoint checks, not blind or a broad quality benchmark. Both models evaluated in this same runtime.')
    # Never overwrite an earlier experiment.
    with args.output.open('x') as stream:json.dump(report,stream,indent=2);stream.write('\n')
    print(json.dumps({'report':str(args.output),'base_passed':before['passed'],'adapter_passed':after['passed'],'total':after['total']}),flush=True)

if __name__=='__main__':main()
