import sys,tempfile,unittest,uuid,copy,json,importlib.util
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,'/opt/cridergpt-engine')
from native_chat_integration.store import Store
from replica import Replica
from worker import Worker
from review import redact,candidates
ACCOUNT=str(uuid.uuid4());OTHER=str(uuid.uuid4());CONV=str(uuid.uuid4());MESSAGE=str(uuid.uuid4());MEMORY=str(uuid.uuid4())
def event(kind='message',revision=1,operation='upsert',account=ACCOUNT):
 remote={'message':MESSAGE,'conversation':CONV,'memory':MEMORY}[kind]
 payload={'id':remote,'conversation_id':CONV,'role':'assistant','content':'The reported ratio is 3.55:1.','title':'Truck facts','created_at':'2026-10-18T00:00:00Z','metadata':{'model':'andromeda-3.0-360m-100','api_key':'must not mirror','request_id':'request-fixture'}}
 return dict(event_id=str(uuid.uuid4()),revision=revision,user_id=account,entity=kind,entity_id=remote,operation=operation,payload=payload)
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'history.sqlite';self.store=Store(self.path);self.replica=Replica(self.path);self.links={ACCOUNT:'owner'}
 def tearDown(self):self.tmp.cleanup()
 def query(self,sql,*args):
  with self.replica.connection() as c:return [dict(r) for r in c.execute(sql,args)]
 def test_import_visible_in_existing_history_and_search(self):
  self.replica.apply([event('conversation'),event()],self.links);conv=self.store.conversations('owner')[0];self.assertTrue(conv['title'].startswith('[Website]'));message=self.store.messages('owner',conv['id'])[0];self.assertIn('3.55',message['content']);self.assertEqual(message['model'],'andromeda-3.0-360m-100');self.assertNotIn('api_key',message['metadata_json']);self.assertFalse(json.loads(message['metadata_json'])['training_approved']);self.assertEqual(len(self.store.search_messages('owner',q='3.55')['items']),1)
 def test_duplicate_delivery_and_out_of_order_backfill(self):
  e=event(revision=5);self.replica.apply([e],self.links);self.replica.apply([e,event(revision=0)],self.links);self.assertEqual(len(self.query('SELECT * FROM local_chat_messages')),1);self.assertEqual(self.query('SELECT revision FROM external_sync_records')[0]['revision'],5)
 def test_isolation_and_unlinked_account_not_acknowledged(self):
  e=event(account=OTHER);self.assertEqual(self.replica.apply([e],self.links),[]);self.assertEqual(self.store.conversations('owner'),[])
 def test_mapped_local_account_stays_separate(self):
  local=self.store.create_account('seconduser','long-test-password');self.replica.apply([event()],{ACCOUNT:local});self.assertEqual(self.store.conversations('owner'),[]);self.assertEqual(len(self.store.conversations(local)),1)
 def test_message_delete_cannot_reappear_from_older_backfill(self):
  self.replica.apply([event(revision=1),event(revision=3,operation='delete'),event(revision=0)],self.links);self.assertEqual(self.query('SELECT * FROM local_chat_messages'),[])
 def test_deleted_parent_blocks_late_message(self):
  self.replica.apply([event('conversation',revision=8,operation='delete'),event(revision=4)],self.links);self.assertEqual(self.query('SELECT * FROM local_chat_messages'),[])
 def test_cloud_memory_is_separate_and_unverified(self):
  self.replica.apply([event('memory')],self.links);m=self.query('SELECT * FROM external_sync_memories')[0];self.assertFalse(json.loads(m['metadata_json'])['verified']);self.assertEqual(self.store.memories('owner'),[]);self.replica.apply([event('memory',revision=3,operation='delete')],self.links);self.assertEqual(self.query('SELECT * FROM external_sync_memories'),[])
 def test_failed_batch_rolls_back_and_cannot_ack(self):
  bad=event(revision=2);bad['payload']['role']='system'
  with self.assertRaises(ValueError):self.replica.apply([event('conversation'),bad],self.links)
  self.assertEqual(self.query('SELECT * FROM native_conversations'),[]);self.assertEqual(self.query('SELECT * FROM external_sync_receipts'),[])
 def test_ack_failure_replay_does_not_duplicate(self):
  e=event();calls=[];fail=[True]
  def request(body):
   calls.append(body['action'])
   if body['action']=='pull':return {'events':[e]}
   if fail[0]:raise OSError('offline')
   return {'ok':True}
  w=Worker({'database':str(self.path),'links':self.links},request)
  with self.assertRaises(RuntimeError):w.poll()
  fail[0]=False;self.assertEqual(w.poll(),1);self.assertEqual(len(self.query('SELECT * FROM local_chat_messages')),1);self.assertEqual(calls,['pull','ack','pull','ack'])
 def test_training_review_redacts_credentials_and_never_approves(self):
  u=event();u['entity_id']=str(uuid.uuid4());u['payload']['role']='user';u['payload']['content']='Heyyy'
  a=event(revision=2);a['payload']['content']='Jessie Crider. API_KEY=private-test-value'
  self.replica.apply([u,a],self.links);items=candidates(self.store,'owner');self.assertEqual(len(items),1);self.assertFalse(items[0]['approved']);self.assertIn('possible_off_topic_identity',items[0]['flags']);self.assertNotIn('private-test-value',str(items))
 def test_source_update_does_not_clobber_original_local_chats(self):
  original=self.store.create('owner');self.store.append('owner',original,'user','Keep this local history',None);self.replica.apply([event(),event(revision=3,operation='delete')],self.links);self.assertEqual(self.store.messages('owner',original)[0]['content'],'Keep this local history')
 def test_staged_store_blocks_imported_conversation_writes(self):
  spec=importlib.util.spec_from_file_location('staged_store',Path(__file__).resolve().parent/'stage/store.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  self.replica.apply([event()],self.links);staged=m.Store(self.path);conversation=staged.conversations('owner')[0]['id']
  with self.assertRaisesRegex(ValueError,'read-only'):staged.append('owner',conversation,'user','Do not fork silently',None)
 def test_original_timestamps_determine_import_order(self):
  first=event();first['payload']['created_at']='2026-10-18T00:10:00Z'
  earlier=event();earlier['entity_id']=str(uuid.uuid4());earlier['payload']['created_at']='2026-10-18T00:00:00Z';earlier['payload']['content']='Earlier record'
  self.replica.apply([first,earlier],self.links)
  spec=importlib.util.spec_from_file_location('staged_order_store',Path(__file__).resolve().parent/'stage/store.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);store=m.Store(self.path);conv=store.conversations('owner')[0]['id'];self.assertEqual(store.messages('owner',conv)[0]['content'],'Earlier record')
 def test_no_implicit_account_link(self):
  with self.assertRaises(ValueError):Worker({'database':str(self.path),'links':{}})
if __name__=='__main__':unittest.main()
