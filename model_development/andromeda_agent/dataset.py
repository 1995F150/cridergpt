"""Review/rights/overlap gates for proposed agent data. Does not train or export."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
from server.planning.core import PlanRequest,validate_response

def normalize(text):return ' '.join(re.findall(r'\w+',text.lower()))

def audit(rows,benchmark):
    reserved=[normalize(case['request']['task']) for case in benchmark['cases']]
    counts=Counter(row.get('id') for row in rows);families={};records=[]
    for row in rows:families.setdefault(row.get('scenario_family'),set()).add(row.get('split'))
    for row in rows:
        errors=[]
        if counts[row.get('id')]>1:errors.append('duplicate_id')
        family=row.get('scenario_family');split=row.get('split')
        if not isinstance(family,str) or not family or split not in ('candidate','train','validation','test'):errors.append('missing_family_or_invalid_split')
        if len(families[family])>1:errors.append('scenario_family_cross_split')
        try:
            request=PlanRequest.model_validate(row['request'])
            normalized=normalize(request.task);words=set(normalized.split())
            if normalized in reserved:errors.append('benchmark_task_overlap')
            elif any(len(words&set(task.split()))/max(1,len(words|set(task.split())))>=.8 for task in reserved):errors.append('possible_near_benchmark_overlap')
            for other in rows:
                if other is row or other.get('split')==split:continue
                other_words=set(normalize(str(other.get('request',{}).get('task',''))).split())
                if len(words&other_words)/max(1,len(words|other_words))>=.8:
                    errors.append('possible_near_cross_split_overlap');break
            validated=validate_response(json.dumps(row['plan']),'eos',request.model_dump())
            if validated['status']!='validated':errors.append('invalid_target_plan')
        except (ValueError,KeyError,TypeError):errors.append('invalid_record')
        if row.get('license') not in ('LicenseRef-CriderGPT-Original','CC0-1.0','CC-BY-4.0') or not row.get('source'):errors.append('rights_source_missing')
        if row.get('rights_reviewed') is not True or not isinstance(row.get('rights_evidence'),str) or not row['rights_evidence'].strip():errors.append('rights_review_pending')
        if row.get('reviewed') is not True:errors.append('quality_review_pending')
        if split=='candidate':errors.append('candidate_not_approved_for_training')
        records.append({'id':row.get('id'),'eligible':not errors,'errors':errors})
    return {'records':records,'total':len(records),'eligible':sum(row['eligible'] for row in records),
            'training_ready':bool(records) and all(row['eligible'] for row in records),
            'human_provenance_and_semantic_review_required':True,'training_started':False}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--data',type=Path,default=Path(__file__).with_name('seed_candidates.jsonl'));args=parser.parse_args()
    rows=[json.loads(line) for line in args.data.read_text().splitlines() if line.strip()]
    benchmark=json.loads(Path(__file__).with_name('benchmark.json').read_text())
    result=audit(rows,benchmark);result['sha256']=hashlib.sha256(args.data.read_bytes()).hexdigest()
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
