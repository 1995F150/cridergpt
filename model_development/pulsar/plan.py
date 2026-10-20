"""Validate data and produce a bounded LoRA proposal. This module never trains."""
import hashlib,json
from pathlib import Path
from prepare_data import validate
P=Path(__file__).resolve().parent

def encode_example(tokenizer,messages,max_tokens):
 full=tokenizer.apply_chat_template(messages,tokenize=True,add_generation_prompt=False,return_dict=False)
 prefix=tokenizer.apply_chat_template(messages[:-1],tokenize=True,add_generation_prompt=True,return_dict=False)
 if full[:len(prefix)]!=prefix:raise ValueError('Chat template prefix does not align; refusing incorrect loss masking')
 if len(full)>max_tokens:raise ValueError('Example exceeds token budget; no silent truncation')
 labels=[-100]*len(prefix)+full[len(prefix):]
 if not any(value!=-100 for value in labels):raise ValueError('No assistant tokens to train')
 return {'input_ids':full,'attention_mask':[1]*len(full),'labels':labels}
def main():
 from transformers import AutoTokenizer
 from safetensors import safe_open
 config=json.loads((P/'config.json').read_text());base=Path(config['base']['path']);manifest=json.loads((P/'data-manifest.json').read_text())
 splits={split:[json.loads(line) for line in (P/(split+'.jsonl')).read_text().splitlines()] for split in ['train','validation']}
 for split in splits:
  if hashlib.sha256((P/(split+'.jsonl')).read_bytes()).hexdigest()!=manifest['sha256'][split]:raise ValueError('Dataset checksum mismatch')
 validate(splits,json.loads((P/'eval_cases.json').read_text()))
 if hashlib.sha256((P/'eval_cases.json').read_bytes()).hexdigest()!=manifest['eval_sha256']:raise ValueError('Evaluation version changed')
 with (base/'model.safetensors').open('rb') as f:
  if hashlib.file_digest(f,'sha256').hexdigest()!=config['base']['weights_sha256']:raise ValueError('Base weight checksum mismatch')
 tok=AutoTokenizer.from_pretrained(base,local_files_only=True,trust_remote_code=False)
 encoded={split:[encode_example(tok,row['messages'],config['pilot_proposal']['max_sequence_tokens']) for row in rows] for split,rows in splits.items()}
 trainable=0;params=0
 with safe_open(base/'model.safetensors',framework='pt') as f:
  for name in f.keys():
   shape=f.get_slice(name).get_shape();count=1
   for dimension in shape:count*=dimension
   params+=count
   if any(name.endswith('.'+module+'.weight') for module in config['pilot_proposal']['target_modules']):trainable+=config['pilot_proposal']['rank']*sum(shape)
 # Conservative planning ranges include interpreter/libraries and activations;
 # these are estimates, not measured training memory or timings.
 report=dict(candidate=config['candidate_id'],status='review_required',training_started=False,base_weight_parameters=params,estimated_lora_trainable_parameters=trainable,proposed_optimizer_steps=10,gradient_accumulation=4,maximum_training_tokens_per_microbatch=256,model_float32_mib=round(params*4/2**20,2),adapter_weights_float32_mib=round(trainable*4/2**20,2),adapter_plus_grad_and_adam_states_mib=round(trainable*16/2**20,2),planning_process_memory_gib=[2,4],extra_disk_budget_mib=256,duration_estimate='2–15 minutes for the proposed 10-step CPU feasibility pilot; uncalibrated estimate, not a measured training benchmark.',training_wall_time_limit_seconds=900,training_estimate_confidence='low: calibrate one forward/backward microbatch before approving a run',cpu_threads=2,paid_api_cost=0,external_training_service=False,requires_review=['all 99 seed examples','base-model and dataset provenance','baseline quality and speed','one-microbatch calibration before a run'],token_lengths={split:{'min':min(map(lambda e:len(e['input_ids']),rows)),'max':max(map(lambda e:len(e['input_ids']),rows))} for split,rows in encoded.items()},training_ready=False,reason='Seed data and pilot are proposals. No run is authorized by creating this plan; no trainer or automatic promotion is invoked.')
 (P/'training-plan.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
