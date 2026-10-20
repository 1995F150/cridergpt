import json
import re
from pathlib import Path
import unittest
from prepare_varied_data import build_varied
from prepare_data import validate
from plan import encode_example
P=Path(__file__).resolve().parent

class Tests(unittest.TestCase):
    def test_varied_data_excludes_all_diagnostic_sets(self):
        rows=build_varied()
        for filename in ['eval_cases.json','fresh_cases.json','final_checks.json']:
            self.assertEqual(validate(rows,json.loads((P/filename).read_text())),273)
    def test_new_line_targets_use_distinct_words(self):
        rows=[r for r in build_varied()['train'] if r['id'].startswith('pulsar-varied-') and r['category']=='exact_format' and '\n' in r['messages'][-1]['content']]
        self.assertEqual(len(rows),32)
        self.assertTrue(all(r['messages'][-1]['content'].splitlines()[0]!=r['messages'][-1]['content'].splitlines()[1] for r in rows))
    def test_new_arithmetic_and_json_references(self):
        rows=[r for r in build_varied()['train'] if r['id'].startswith('pulsar-varied-')]
        for row in rows:
            answer=row['messages'][-1]['content']
            if row['category']=='arithmetic':
                question=row['messages'][0]['content']
                a,b=map(int,re.findall(r'\d+',question))
                self.assertEqual(int(answer),a-b if 'minus' in question else a+b)
            if row['category']=='json':
                question=row['messages'][0]['content']
                match=re.search(r'one key (\w+) and value (\w+)',question) or re.search(r'containing (\w+) set to the string (\w+)',question)
                self.assertEqual(json.loads(answer),{match[1]:match[2]})
    def test_same_system_prefix_is_masked(self):
        class Tokenizer:
            def apply_chat_template(self,messages,**kwargs):
                self.roles=[m['role'] for m in messages]
                return [1,2] if kwargs['add_generation_prompt'] else [1,2,3,4]
        tokenizer=Tokenizer()
        result=encode_example(tokenizer,[{'role':'system','content':'policy'},{'role':'user','content':'q'},{'role':'assistant','content':'a'}],256)
        self.assertEqual(result['labels'],[-100,-100,3,4])

if __name__=='__main__':unittest.main()
