"""Read-only CPU comparison. No server changes, training, caches of responses, or code execution."""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',TOKENIZERS_PARALLELISM='false',OMP_NUM_THREADS='2')
import argparse,ast,hashlib,json,re,resource,statistics,time
from pathlib import Path
P=Path(__file__).resolve().parent
SYSTEM='You are a helpful assistant. Answer concisely and follow the requested format. Do not invent personal information.'
def hashfile(path):
 with path.open('rb') as file:return hashlib.file_digest(file,'sha256').hexdigest()
def clean_code(text):
 match=re.fullmatch(r'```(?:python)?\s*\n(.*?)\n```',text.strip(),re.S)
 return match[1] if match else text.strip()
def grade(case,text):
 text=text.strip();kind=case['kind']
 if kind=='exact':return text==case['expected']
 if kind=='contains':return case['expected'].casefold() in text.casefold()
 if kind=='greeting':return bool(re.search(r'\b(hello|hi|hey|greetings)\b',text,re.I)) and 'monkey' not in text.lower()
 if kind=='uncertainty':return bool(re.search(r'birthday|birthdate|birth date|date of birth',text,re.I)) and bool(re.search(r"don't know|do not know|unknown|not (?:have|available|provided|specified)|cannot verify|can't verify|no (?:information|verified)",text,re.I)) and not re.search(r'\b(?:19|20)\d{2}[-/]\d',text)
 try:
  if kind=='json':return json.loads(text)==case['expected']
  if kind=='python_list':
   if len(text)>2000:return False
   tree=ast.parse(clean_code(text))
   if len(tree.body)!=1:return False
   node=tree.body[0]
   if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name):node=node.value
   elif isinstance(node,ast.Expr):node=node.value
   else:return False
   return ast.literal_eval(node)==case['expected']
 except (ValueError,SyntaxError,TypeError,RecursionError):return False
 return False
class FirstToken:
 def __init__(self):self.skip=True;self.time=None
 def put(self,value):
  if self.skip:self.skip=False
  elif self.time is None:self.time=time.monotonic()
 def end(self):pass

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--model',choices=['base','comparison'],required=True);args=parser.parse_args()
 config=json.loads((P/'config.json').read_text());entry=config[args.model];path=Path(entry['path'])
 if hashfile(path/'model.safetensors')!=entry['weights_sha256']:raise SystemExit('Weights do not match the pinned candidate')
 import torch
 from transformers import AutoModelForCausalLM,AutoTokenizer
 torch.set_num_threads(config['inference']['threads']);torch.set_num_interop_threads(1)
 tick=time.monotonic();tokenizer=AutoTokenizer.from_pretrained(path,local_files_only=True,trust_remote_code=False)
 model=AutoModelForCausalLM.from_pretrained(path,local_files_only=True,trust_remote_code=False,dtype=torch.float32,attn_implementation='eager').eval()
 assert max(tokenizer.get_vocab().values())<model.get_input_embeddings().num_embeddings
 assert all(torch.isfinite(parameter).all() for parameter in model.parameters())
 load_seconds=time.monotonic()-tick
 cases=json.loads((P/'eval_cases.json').read_text());results=[]
 # Warm up separately; never include cold-loading time in steady-state latency.
 warm=tokenizer.apply_chat_template([{'role':'user','content':'Hello'}],add_generation_prompt=True,return_tensors='pt',return_dict=True)
 with torch.inference_mode():model.generate(**warm,max_new_tokens=2,do_sample=False,pad_token_id=tokenizer.eos_token_id)
 for case in cases:
  messages=[{'role':'system','content':SYSTEM},*case['messages']]
  inputs=tokenizer.apply_chat_template(messages,add_generation_prompt=True,return_tensors='pt',return_dict=True)
  input_tokens=inputs['input_ids'].shape[1]
  if input_tokens+config['inference']['max_new_tokens']>config['inference']['context_budget']:raise ValueError('Evaluation prompt exceeds the configured context budget')
  stream=FirstToken();started=time.monotonic()
  with torch.inference_mode():out=model.generate(**inputs,max_new_tokens=config['inference']['max_new_tokens'],max_time=config['inference']['max_time_seconds'],do_sample=False,pad_token_id=tokenizer.eos_token_id,use_cache=True,streamer=stream)
  duration=time.monotonic()-started;generated=out[0,input_tokens:];text=tokenizer.decode(generated,skip_special_tokens=True)
  eos=model.generation_config.eos_token_id;eos=[eos] if isinstance(eos,int) else eos or [tokenizer.eos_token_id]
  finish='eos' if len(generated) and generated[-1].item() in eos else 'token_limit' if len(generated)>=config['inference']['max_new_tokens'] else 'time_limit'
  results.append(dict(id=case['id'],response=text,passed=grade(case,text),finish_reason=finish,input_tokens=input_tokens,output_tokens=len(generated),seconds=round(duration,4),ttft_seconds=round(stream.time-started,4) if stream.time else None,tokens_per_second=round(len(generated)/duration,3),prompt_sha256=hashlib.sha256(json.dumps(messages,sort_keys=True).encode()).hexdigest(),response_sha256=hashlib.sha256(text.encode()).hexdigest()))
  print(json.dumps({'model':args.model,**results[-1]}),flush=True)
 report=dict(model=args.model,weights_sha256=entry['weights_sha256'],path=str(path),parameter_count=sum(p.numel() for p in model.parameters()),load_seconds=round(load_seconds,3),peak_process_rss_mib=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),generation_config=config['inference'],system_prompt=SYSTEM,eval_sha256=hashfile(P/'eval_cases.json'),grader_sha256=hashfile(Path(__file__)),score=sum(r['passed'] for r in results)/len(results),median_seconds=statistics.median(r['seconds'] for r in results),median_ttft_seconds=statistics.median(r['ttft_seconds'] for r in results if r['ttft_seconds'] is not None),median_tokens_per_second=statistics.median(r['tokens_per_second'] for r in results),results=results,pulsar_training_performed=False,deployment_changes=False,weights_source='unmodified upstream instruction model' if args.model=='base' else 'existing fine-tuned Andromeda checkpoint',warning='Tiny synthetic smoke suite, heuristic grading, one run per prompt; not a general intelligence benchmark. Benchmark scope is CPU-capped separately from production.')
 (P/('baseline-'+args.model+'.json')).write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ['results','system_prompt','generation_config']}),flush=True)
if __name__=='__main__':main()
