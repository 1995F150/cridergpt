"""Compare recorded measurements without promoting or registering any model."""
import json
from pathlib import Path
P=Path(__file__).resolve().parent
def compare(base,reference,policy):
 if base['eval_sha256']!=reference['eval_sha256'] or base.get('grader_sha256')!=reference.get('grader_sha256') or base['generation_config']!=reference['generation_config']:raise ValueError('Comparison configuration differs')
 ratio=base['median_tokens_per_second']/reference['median_tokens_per_second']
 quality_ok=base['score']>=policy['minimum_smoke_score'] and base['score']>=reference['score']-policy['maximum_smoke_regression_vs_andromeda']
 return dict(candidate='pulsar-1.0-135m-candidate1',median_throughput_ratio=round(ratio,3),base_smoke_passed=sum(r['passed'] for r in base['results']),andromeda_smoke_passed=sum(r['passed'] for r in reference['results']),cases=len(base['results']),speed_target_met=ratio>=policy['minimum_throughput_ratio_vs_andromeda'],quality_target_met=quality_ok,failed_case_ids=[r['id'] for r in base['results'] if not r['passed']],release_ready=False,training_started=False,deployed=False,reason='A faster baseline is not a trained/released Pulsar. Smoke tests require human review and cannot establish broad quality; no automatic promotion.',limitations=['Nine synthetic cases, heuristic graders and a single sample per case.','Both runs are capped to one CPU core-equivalent with two Torch threads.','Outputs vary in length; throughput and latency are descriptive, not identical-token controlled trials.','Neutral shared prompt differs from current production persona, so this is not production endpoint latency.'])
if __name__=='__main__':
 base=json.loads((P/'baseline-base.json').read_text());reference=json.loads((P/'baseline-comparison.json').read_text());config=json.loads((P/'config.json').read_text())
 report=compare(base,reference,config['release_policy']);(P/'comparison.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
