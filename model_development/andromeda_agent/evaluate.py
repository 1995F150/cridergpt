"""Fixed, offline, bounded checkpoint benchmark. Writes only a NEW report directory."""
import os
os.environ.update(PYTHONDONTWRITEBYTECODE='1',HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',CUDA_VISIBLE_DEVICES='')
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import resource
import statistics
import sys
import time

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from server.planning.core import messages,validate_response,suspicious_claims,SYSTEM,TaskPlan
from server.planning.offline import OfflineModel,digest,ContextLimit
P=Path(__file__).parent

def grade(case,validated):
    if validated['status']!='validated':return {'passed':False,'failures':['not_a_valid_complete_plan']}
    plan=validated['plan'];rule=case['rubric'];failures=[]
    if plan['status']!=rule['status']:failures.append('wrong_task_disposition')
    if len(plan['steps'])<rule['minimum_steps']:failures.append('insufficient_decomposition')
    if len(plan['steps'])>1 and not any(step['depends_on'] for step in plan['steps'][1:]):failures.append('missing_dependencies')
    names={cap['name'] for cap in plan['capabilities']}
    if not set(rule['required_capabilities'])<=names:failures.append('missing_required_capability')
    text=json.dumps(plan).lower()
    if any(not any(word in text for word in group) for group in rule['keyword_groups']):failures.append('missing_task_evidence')
    return {'passed':not failures,'failures':failures}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--model',required=True);parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--max-new-tokens',type=int,default=256);parser.add_argument('--max-seconds',type=int,default=40)
    args=parser.parse_args()
    args.output.mkdir(mode=0o700,parents=False,exist_ok=False)
    entry=next(item for item in json.loads((P/'checkpoints.json').read_text())['checkpoints'] if item['id']==args.model and item['kind']=='full_weights')
    cases=json.loads((P/'benchmark.json').read_text())['cases'];benchmark_hash=digest(P/'benchmark.json')
    pinned={'benchmark':benchmark_hash,'evaluator':digest(__file__),'contract':digest(ROOT/'server/planning/core.py'),'adapter':digest(ROOT/'server/planning/offline.py')}
    (args.output/'pins.json').write_text(json.dumps(pinned,indent=2)+'\n')
    start=time.monotonic();model=OfflineModel(entry,args.max_new_tokens,args.max_seconds);load=time.monotonic()-start
    tokenizer=model.tokenizer
    # Verify actual loaded tokenizer/config special IDs rather than model-name assumptions.
    audit={'tokenizer_class':type(tokenizer).__name__,'vocab_size':len(tokenizer),'embedding_rows':model.model.get_input_embeddings().num_embeddings,
           'bos_token_id':tokenizer.bos_token_id,'eos_token_id':tokenizer.eos_token_id,'pad_token_id':tokenizer.pad_token_id,
           'model_eos_token_id':model.model.generation_config.eos_token_id,'chat_template_sha256':hashlib.sha256(tokenizer.chat_template.encode()).hexdigest(),
           'model_context_config':model.model.config.max_position_embeddings,'development_context_budget':entry['context_budget']}
    results=[]
    for case in cases:
        request=case['request'];turns=messages(request);started=time.monotonic()
        try:
            output=model(turns);validation=validate_response(output['response'],output['finish_reason'],request)
            score=grade(case,validation)
        except ContextLimit:
            output={'response':'','finish_reason':'context_length_exceeded'};validation={'status':'context_length_exceeded','plan':None,'validation_errors':[]};score={'passed':False,'failures':['context_length_exceeded']}
        except Exception as error:
            output={'response':'','finish_reason':'internal_error','error_type':type(error).__name__};validation={'status':'inference_error','plan':None,'validation_errors':[]};score={'passed':False,'failures':['inference_error']}
        raw=output['response'];words=raw.lower().split();fourgrams=[' '.join(words[i:i+4]) for i in range(max(0,len(words)-3))]
        repetitive=bool(fourgrams and max(Counter(fourgrams).values())>=4)
        row={'id':case['id'],'category':case['category'],**output,'prompt_sha256':hashlib.sha256(json.dumps(turns,sort_keys=True).encode()).hexdigest(),
             'response_sha256':hashlib.sha256(raw.encode()).hexdigest(),'validation_status':validation['status'],'validation_errors':validation['validation_errors'],
             'validated_plan':validation['plan'],'possible_fabricated_execution_claim':suspicious_claims(raw),'repetitive_output':repetitive,**score}
        results.append(row)
        with (args.output/'cases.jsonl').open('a') as stream:stream.write(json.dumps(row)+'\n')
        print(json.dumps({'model':args.model,'case':case['id'],'finish_reason':output['finish_reason'],'validation':validation['status'],'passed':score['passed'],'seconds':round(time.monotonic()-started,2)}),flush=True)
    # Identical answers to the intentionally repeated task are not stale-answer evidence.
    groups={}
    for row in results:
        if row['response'].strip():groups.setdefault(row['response_sha256'],set()).add(row['prompt_sha256'])
    duplicate_across_tasks=sum(len(prompts)>1 for prompts in groups.values())
    import torch,transformers,pydantic
    report={'model':entry,'pins':pinned,'tokenizer':audit,'configuration':{'max_new_tokens':args.max_new_tokens,'max_seconds':args.max_seconds,'seed':0,'do_sample':False,'threads':1,'dtype':'float32','context_truncation':False,'repair_attempts':0,'external_calls':0},
            'runtime':{'torch':torch.__version__,'transformers':transformers.__version__,'pydantic':pydantic.__version__},'load_seconds':round(load,3),
            'peak_process_rss_mib':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1),'total':len(results),'complete_eos':sum(r['finish_reason']=='eos' for r in results),
            'validated_plans':sum(r['validation_status']=='validated' for r in results),'rubric_passed':sum(r['passed'] for r in results),
            'repetitive_cases':sum(r['repetitive_output'] for r in results),'possible_execution_claim_cases':sum(r['possible_fabricated_execution_claim'] for r in results),
            'identical_answer_groups_across_different_tasks':duplicate_across_tasks,'generation_calls':model.calls,
            'median_generation_seconds':statistics.median(r.get('seconds',0) for r in results),'results':results,
            'checkpoint_hash_after':digest(Path(entry['path'])/'model.safetensors'),'production_changes':False,'training_performed':False,'agent_ready':False,
            'limitations':'Small synthetic development screen with heuristic semantic checks, not blind or a comprehensive safety/quality assessment. No constrained decoding or output repair; no tool execution.'}
    assert benchmark_hash==digest(P/'benchmark.json') and report['checkpoint_hash_after']==entry['sha256']
    with (args.output/'report.json').open('x') as stream:json.dump(report,stream,indent=2);stream.write('\n')
    print(json.dumps({'report':str(args.output/'report.json'),'validated':report['validated_plans'],'rubric_passed':report['rubric_passed'],'total':report['total']}),flush=True)

if __name__=='__main__':main()
