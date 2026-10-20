import copy
import json
from pathlib import Path
import unittest
from .dataset import audit
from .evaluate import grade
from server.planning.core import validate_response
from .encoding import encode_candidate

P=Path(__file__).parent
class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.rows=[json.loads(line) for line in (P/'seed_candidates.jsonl').read_text().splitlines()];self.benchmark=json.loads((P/'benchmark.json').read_text())
    def test_seeds_are_contract_valid_but_not_training_ready(self):
        result=audit(self.rows,self.benchmark)
        self.assertEqual(result['eligible'],0);self.assertFalse(result['training_ready'])
        self.assertTrue(all('invalid_target_plan' not in row['errors'] and 'benchmark_task_overlap' not in row['errors'] for row in result['records']))
    def test_rights_and_review_are_required(self):
        row=copy.deepcopy(self.rows[0]);row['split']='train';row['reviewed']=True
        self.assertIn('rights_review_pending',audit([row],self.benchmark)['records'][0]['errors'])
        row['rights_reviewed']=True;row['rights_evidence']='Fixture rights attestation'
        self.assertEqual(audit([row],self.benchmark)['eligible'],1)
    def test_benchmark_leak_and_family_cross_split_are_blocked(self):
        row=copy.deepcopy(self.rows[0]);row['request']=self.benchmark['cases'][0]['request']
        self.assertIn('benchmark_task_overlap',audit([row],self.benchmark)['records'][0]['errors'])
        a=copy.deepcopy(self.rows[0]);b=copy.deepcopy(a);b['id']='other';a['split']='train';b['split']='validation'
        self.assertIn('scenario_family_cross_split',audit([a,b],self.benchmark)['records'][1]['errors'])
    def test_schema_validity_does_not_equal_task_success(self):
        validated=validate_response(json.dumps(self.rows[0]['plan']))
        self.assertEqual(validated['status'],'validated')
        score=grade(self.benchmark['cases'][2],validated)
        self.assertFalse(score['passed']);self.assertIn('missing_required_capability',score['failures'])
    def test_repeated_benchmark_prompt_is_intentional(self):
        self.assertEqual(self.benchmark['cases'][0]['request'],self.benchmark['cases'][10]['request'])
    def test_assistant_only_mask_keeps_eos_even_when_it_is_pad(self):
        class Tokenizer:
            eos_token_id=2
            pad_token_id=2
            def apply_chat_template(self,turns,**kwargs):
                assert kwargs['return_dict'] is True
                return {'input_ids':[1,3,4] if kwargs.get('add_generation_prompt') else [1,3,4,8,9,2]}
        encoded=encode_candidate(self.rows[0],Tokenizer(),6)
        self.assertEqual(encoded['labels'],[-100,-100,-100,8,9,2])
        self.assertEqual(encoded['attention_mask'],[1]*6)
        with self.assertRaises(ValueError):encode_candidate(self.rows[0],Tokenizer(),5)
    def test_bad_token_boundaries_and_missing_eos_are_rejected(self):
        class Tokenizer:
            eos_token_id=2
            def apply_chat_template(self,turns,**kwargs):return {'input_ids':[1,3] if kwargs.get('add_generation_prompt') else [1,9,2]}
        with self.assertRaises(ValueError):encode_candidate(self.rows[0],Tokenizer(),10)
        class NoEOS:
            eos_token_id=2
            def apply_chat_template(self,turns,**kwargs):return {'input_ids':[1,3] if kwargs.get('add_generation_prompt') else [1,3,8]}
        with self.assertRaises(ValueError):encode_candidate(self.rows[0],NoEOS(),10)

if __name__=='__main__':unittest.main()
