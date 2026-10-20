"""Read one request from stdin; print a validated plan or explicit failure.

No listener, tools, execution, persistence, retrieval or production API integration.
Run with PYTHONDONTWRITEBYTECODE=1; all model artifacts must already be local.
"""
import argparse
import json
from pathlib import Path
import sys
from .core import Planner,PlanRequest
from .offline import OfflineModel,ContextLimit

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model',required=True)
    parser.add_argument('--catalog',type=Path,default=Path(__file__).parents[2]/'model_development/andromeda_agent/checkpoints.json')
    args=parser.parse_args()
    try:
        raw=sys.stdin.read(12001)
        if len(raw)>12000:raise ValueError('Request too large')
        request=PlanRequest.model_validate_json(raw)
        entry=next(item for item in json.loads(args.catalog.read_text())['checkpoints'] if item['id']==args.model and item['kind']=='full_weights')
        model=OfflineModel(entry)
        result=Planner(model).plan(request.model_dump())
    except ContextLimit:result={'status':'context_length_exceeded','execution_enabled':False,'plan':None}
    except Exception:result={'status':'planning_unavailable','execution_enabled':False,'plan':None}
    print(json.dumps(result,ensure_ascii=False))
    return 0 if result['status']=='validated' else 2

if __name__=='__main__':raise SystemExit(main())
