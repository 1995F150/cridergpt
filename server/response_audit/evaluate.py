"""Read-only, isolated candidate comparison using public synthetic prompts only."""
import gc,hashlib,json,sys,time
from pathlib import Path
ROOT=Path('/home/cridergpt2026/cridergpt-engine-verified')
sys.path[:0]=[str(ROOT/'validation-tools'),str(ROOT)]
P=Path(__file__).resolve().parent
if "--fixed" in sys.argv:sys.path.insert(0,str(P/"stage"))
from candidate_serving import CandidateServing
CASES=[('greeting',[{'role':'user','content':'Hey there'}]),('sky',[{'role':'user','content':'What color is the sky on a clear day?'}]),('math',[{'role':'user','content':'What is 2 + 2?'}]),('python',[{'role':'user','content':'Write a Python list containing eggs and milk.'}]),('history_sky',[{'role':'user','content':'Are you a monkey?'},{'role':'assistant','content':"No, I'm not a monkey."},{'role':'user','content':'What color is the sky on a clear day?'}]),('greeting_again',[{'role':'user','content':'Hey there'}])]
SOURCES=[('step100',ROOT/'artifacts/cridergpt-3.0-andromeda-20261012-142146/checkpoint-100'),('pilot_step10',ROOT/'artifacts/cridergpt-3.0-andromeda-pilot-20261012-134203/checkpoint-pilot'),('upstream',ROOT/'pretrained-bases/SmolLM2-360M-Instruct-a10cc151')]
results=[]
for label,path in SOURCES:
 if not (path/'model.safetensors').exists():
  results.append({'checkpoint':label,'unavailable':True});continue
 digest=hashlib.file_digest((path/'model.safetensors').open('rb'),'sha256').hexdigest()
 report=P/(label+'.fixture-report.json');report.write_text(json.dumps({'name':'CriderGPT 3.0 Andromeda','family':'pretrained','output_checkpoint':str(path),'weights_sha256':digest,'context_limit':1280}))
 runtime=CandidateServing([report])
 for case,turns in CASES:
  started=time.monotonic()
  try:
   output=runtime.generate('CriderGPT 3.0 Andromeda',turns,max_new_tokens=48,persona=True)
   row={'checkpoint':label,'weights_sha256':digest,'case':case,'prompt_sha256':hashlib.sha256(json.dumps(turns,sort_keys=True).encode()).hexdigest(),'response':output['response'],'response_sha256':hashlib.sha256(output['response'].encode()).hexdigest(),'finish_reason':output.get('finish_reason'),'input_tokens':output.get('input_tokens'),'generated_tokens':output.get('generated_tokens'),'seconds':round(time.monotonic()-started,3)}
  except Exception as error:row={'checkpoint':label,'case':case,'error_type':type(error).__name__,'error':str(error)}
  results.append(row);print(json.dumps(row),flush=True);(P/('comparison-fixed.json' if '--fixed' in sys.argv else 'comparison.json')).write_text(json.dumps(results,indent=2))
 del runtime;gc.collect()
