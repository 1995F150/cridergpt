import json
from pathlib import Path
import tempfile
import unittest
from personal_data import prepare

FACTS={'confirmed':{key:{'value':value} for key,value in {'year':1980,'make':'Fixture','engine_displacement_liters':5.0,'rear_axle_ratio':'4.10:1'}.items()},'reported_unverified':{'model':'Test250','family_history':'UNVERIFIED_HISTORY'}}

class PrivatePacketTests(unittest.TestCase):
    def test_private_scope_and_unverified_claims_stay_out_of_candidates(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)/'packet';manifest=prepare(root,FACTS)
            self.assertFalse(manifest['training_ready']);self.assertFalse(manifest['training_started'])
            self.assertEqual(root.stat().st_mode&0o777,0o700)
            train=(root/'candidate.jsonl').read_text()
            self.assertNotIn('Test250',train);self.assertNotIn('UNVERIFIED_HISTORY',train)
            self.assertIn('4.10:1',train)
            for path in root.iterdir():self.assertEqual(path.stat().st_mode&0o777,0o600)
            self.assertEqual((root/'image-labels.jsonl').read_text(),'')
    def test_existing_packet_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)/'packet';prepare(root,FACTS)
            with self.assertRaises(FileExistsError):prepare(root,FACTS)
    def test_holdout_ids_are_not_training_ids(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)/'packet';prepare(root,FACTS)
            read=lambda name:[json.loads(line) for line in (root/name).read_text().splitlines()]
            train=read('candidate.jsonl');holdout=read('holdout.jsonl')
            self.assertFalse({row['id'] for row in train}&{row['id'] for row in holdout})
            self.assertTrue(all(not row['reviewed'] for row in train))

if __name__=='__main__':unittest.main()
