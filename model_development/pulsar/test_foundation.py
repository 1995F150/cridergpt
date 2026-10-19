import copy,json,unittest
from pathlib import Path
from benchmark import grade
from prepare_data import build,validate
from plan import encode_example
P=Path(__file__).resolve().parent
class Tests(unittest.TestCase):
 def test_seed_splits_exclude_evaluation_and_known_bad_targets(self):
  data=build();self.assertEqual(validate(data,json.loads((P/'eval_cases.json').read_text())),99)
 def test_duplicate_split_is_rejected(self):
  data=build();data['validation'].append(copy.deepcopy(data['train'][0]))
  with self.assertRaises(ValueError):validate(data,[])
 def test_evaluation_contamination_rejected(self):
  data=build()
  with self.assertRaises(ValueError):validate(data,[{'messages':data['train'][0]['messages'][:-1]}])
 def test_generic_bad_reply_not_allowed_as_training_target(self):
  data=build();data['train'][0]['messages'][-1]['content']="You're welcome!"
  with self.assertRaises(ValueError):validate(data,[])
 def test_python_grading_never_executes_code_and_requires_correct_list(self):
  case=dict(kind='python_list',expected=['eggs','milk','butter'])
  self.assertTrue(grade(case,"items = ['eggs', 'milk', 'butter']"))
  self.assertFalse(grade(case,"__import__('os').system('false')"));self.assertFalse(grade(case,"eggs = [1,2,3]"))
 def test_exact_and_json_checks_reject_extra_prose(self):
  self.assertFalse(grade(dict(kind='exact',expected='17'),'The answer is 17.'))
  self.assertFalse(grade(dict(kind='json',expected={'color':'blue'}),'Here: {"color":"blue"}'))
 def test_loss_mask_excludes_all_prompt_tokens(self):
  class Tokenizer:
   def apply_chat_template(self,messages,**kw):return [10,11] if kw['add_generation_prompt'] else [10,11,12,2]
  encoded=encode_example(Tokenizer(),[{'role':'user','content':'Hi'},{'role':'assistant','content':'Hello'}],8)
  self.assertEqual(encoded['labels'],[-100,-100,12,2])
 def test_bad_template_or_long_example_is_rejected(self):
  class Tokenizer:
   def apply_chat_template(self,messages,**kw):return [1] if kw['add_generation_prompt'] else [2,3]
  with self.assertRaises(ValueError):encode_example(Tokenizer(),[],8)
 def test_no_automatic_training_or_deployment(self):
  config=json.loads((P/'config.json').read_text());self.assertFalse(config['trained']);self.assertFalse(config['deployed']);self.assertFalse(config['pilot_proposal']['automatic_start']);self.assertFalse(config['release_policy']['automatic_promotion'])
 def test_fast_but_weak_candidate_cannot_be_promoted(self):
  from summarize import compare
  config=json.loads((P/'config.json').read_text())
  report=dict(eval_sha256='same',generation_config={},median_tokens_per_second=10,score=0.5,results=[{'passed':False,'id':'format'}])
  other=dict(report,median_tokens_per_second=3)
  result=compare(report,other,config['release_policy'])
  self.assertTrue(result['speed_target_met']);self.assertFalse(result['quality_target_met']);self.assertFalse(result['release_ready'])
 def test_benchmark_versions_must_match(self):
  from summarize import compare
  with self.assertRaises(ValueError):compare(dict(eval_sha256='a'),dict(eval_sha256='b'),{})

if __name__=='__main__':unittest.main()
