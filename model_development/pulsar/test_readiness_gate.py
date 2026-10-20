import unittest
from readiness_gate import assess
class Tests(unittest.TestCase):
 def fixture(self,count,passed=True):return [{'id':str(i),'passed':passed,'finish_reason':'eos'} for i in range(count)]
 def test_nine_out_of_nine_alone_cannot_promote(self):
  self.assertFalse(assess({'after':{'results':self.fixture(9)}},{'before':{'results':self.fixture(12)},'after':{'results':self.fixture(12,False)}})['eligible_for_release_candidate'])
 def test_repetition_to_token_limit_is_not_complete(self):
  original={'after':{'results':self.fixture(9)}};original['after']['results'][0]['finish_reason']='token_limit'
  result=assess(original,{'before':{'results':self.fixture(12)},'after':{'results':self.fixture(12)}})
  self.assertEqual(result['original_complete_passes'],8);self.assertFalse(result['eligible_for_release_candidate'])
 def test_reviews_and_independent_results_required(self):
  original={'after':{'results':self.fixture(9)}};independent={'before':{'results':self.fixture(12)},'after':{'results':self.fixture(12)}}
  review={k:True for k in ['human_quality_review','safety_review','authenticated_api_isolation','load_and_recovery','rollback_verified','dataset_provenance_review']}
  result=assess(original,independent,review);self.assertTrue(result['eligible_for_release_candidate']);self.assertFalse(result['production_ready']);self.assertFalse(result['deployed'])
if __name__=='__main__':unittest.main()
