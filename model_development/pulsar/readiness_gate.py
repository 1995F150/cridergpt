"""Read-only promotion gate. Never registers, relabels, merges or deploys a model."""
import argparse
import json
from pathlib import Path

def assess(original,independent,review=None):
 review=review or {};reasons=[]
 old=original['after']['results'];new=independent['after']['results'];baseline={r['id']:r for r in independent['before']['results']}
 complete=lambda r:bool(r['passed']) and r['finish_reason']=='eos'
 if len(old)!=9 or sum(complete(r) for r in old)!=9:reasons.append('Original nine development checks are not all correct and complete')
 if len(new)<12 or sum(complete(r) for r in new)/max(len(new),1)<.9:reasons.append('Independent complete-response score is below 90%')
 regressions=[r['id'] for r in new if complete(baseline.get(r['id'],{'passed':False,'finish_reason':None})) and not complete(r)]
 if regressions:reasons.append('Independent regression cases: '+', '.join(regressions))
 for item in ['human_quality_review','safety_review','authenticated_api_isolation','load_and_recovery','rollback_verified','dataset_provenance_review']:
  if review.get(item) is not True:reasons.append('Missing verified review: '+item)
 return {'eligible_for_release_candidate':not reasons,'production_ready':False,'deployed':False,'original_complete_passes':sum(complete(r) for r in old),'independent_complete_passes':sum(complete(r) for r in new),'regressions':regressions,'blocking_reasons':reasons,'note':'Passing this gate permits release-candidate review only; it never constitutes production promotion.'}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--review',type=Path);args=parser.parse_args();p=Path(__file__).resolve().parent
 result=assess(json.loads((p/'varied-pilot-results.json').read_text()),json.loads((p/'final-results.json').read_text()),json.loads(args.review.read_text()) if args.review else None)
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
