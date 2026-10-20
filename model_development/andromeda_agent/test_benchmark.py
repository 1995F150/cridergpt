import hashlib
import json
from pathlib import Path
import unittest
from server.planning.core import TaskPlan,messages,validate_response
from .evaluate import grade

P=Path(__file__).parent;ROOT=P.parents[1]
class BenchmarkIntegrityTests(unittest.TestCase):
    def test_report_source_pins_and_schema_are_unchanged(self):
        for name in ['pilot-10','step-100']:
            report=json.loads((P/'results'/f'{name}.json').read_text())
            files={'benchmark':P/'benchmark.json','evaluator':P/'evaluate.py','contract':ROOT/'server/planning/core.py','adapter':ROOT/'server/planning/offline.py'}
            for key,path in files.items():self.assertEqual(report['pins'][key],hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(report['checkpoint_hash_after'],report['model']['sha256'])
        self.assertEqual(json.loads((P/'schema.json').read_text()),TaskPlan.model_json_schema())
    def test_raw_outputs_reproduce_validation_and_scores_without_model(self):
        cases={case['id']:case for case in json.loads((P/'benchmark.json').read_text())['cases']}
        for name in ['pilot-10','step-100']:
            report=json.loads((P/'results'/f'{name}.json').read_text())
            for row in report['results']:
                case=cases[row['id']];validated=validate_response(row['response'],row['finish_reason'],case['request'])
                self.assertEqual(row['validation_status'],validated['status']);self.assertEqual(row['passed'],grade(case,validated)['passed'])
                self.assertEqual(row['response_sha256'],hashlib.sha256(row['response'].encode()).hexdigest())
                self.assertEqual(row['prompt_sha256'],hashlib.sha256(json.dumps(messages(case['request']),sort_keys=True).encode()).hexdigest())
    def test_each_task_was_a_fresh_generation_and_repetition_is_separate(self):
        for name in ['pilot-10','step-100']:
            report=json.loads((P/'results'/f'{name}.json').read_text())
            self.assertEqual(report['generation_calls'],12)
            self.assertEqual([row['generation_call'] for row in report['results']],list(range(1,13)))
            self.assertEqual(report['results'][0]['prompt_sha256'],report['results'][10]['prompt_sha256'])
            self.assertEqual(report['results'][0]['response_sha256'],report['results'][10]['response_sha256'])
            self.assertFalse(report['training_performed']);self.assertFalse(report['production_changes']);self.assertFalse(report['agent_ready'])

if __name__=='__main__':unittest.main()
