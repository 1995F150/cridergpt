import sys,os,importlib.util,tempfile,threading,json,uuid,unittest,urllib.request,urllib.error
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/home/cridergpt2026/cridergpt-chat-api')
sys.path[:0]=[str(P),str(ROOT)];os.environ['CRIDERGPT_API_ROOT']=str(ROOT)
from gateway_journal import Journal
spec=importlib.util.spec_from_file_location('staged_gateway',P/'stage/gateway_server.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
from native_chat_integration.store import Store
from replica import Replica
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.journal=Journal(Path(self.tmp.name)/'journal.db');self.model=next(iter(module.models()))
  def generate(model,messages):return {'model':model,'weights_sha256':module.models()[model]['sha256'],'response':'A recorded reply.','generated_tokens':4}
  self.s=module.API(('127.0.0.1',0),'k'*48,generate=generate,journal=self.journal,sync_key='s'*48,key_validator=lambda key:key=='client-key');self.thread=threading.Thread(target=self.s.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.s.shutdown();self.s.server_close();self.thread.join();self.tmp.cleanup()
 def req(self,path,body=None,key='client-key'):
  request=urllib.request.Request('http://127.0.0.1:'+str(self.s.server_port)+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','Authorization':'Bearer '+key})
  try:
   with urllib.request.urlopen(request) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_api_exchange_reaches_existing_local_history(self):
  status,data=self.req('/v1/chat',{'model':self.model,'message':'Remember my ratio is 3.55.','conversation_id':'truck'});self.assertEqual(status,200)
  account=data['history']['source_account'];events=self.journal.pull([account]);self.assertEqual(len(events),4)
  store=Store(Path(self.tmp.name)/'local.db');replica=Replica(store.path);replica.apply(events,{account:'owner'});self.assertEqual(len(store.conversations('owner')),1);self.assertEqual(len(store.messages('owner',store.conversations('owner')[0]['id'])),2);self.assertEqual(len(store.request_events('owner')['items']),1)
  self.assertNotIn('k'*48,json.dumps(events));self.journal.ack([account],[e['event_id'] for e in events]);self.assertEqual(self.journal.pull([account]),[])
 def test_inference_key_cannot_export_private_history(self):
  self.assertEqual(self.req('/internal/history-sync',{'action':'pull','user_ids':[str(uuid.uuid4())]})[0],403)
  self.assertEqual(self.req('/internal/history-sync',{'action':'pull','user_ids':[str(uuid.uuid4())]},'s'*48)[0],200)
 def test_client_namespaces_do_not_merge_accounts(self):
  _,a=self.req('/v1/chat',{'model':self.model,'message':'Hello','client_user_id':'A'});_,b=self.req('/v1/chat',{'model':self.model,'message':'Hello','client_user_id':'B'});self.assertNotEqual(a['history']['source_account'],b['history']['source_account'])
 def test_shared_master_has_no_chat_content_in_journal(self):
  code,data=self.req('/v1/chat',{'model':self.model,'message':'Private website text'},'k'*48);self.assertEqual(code,200);events=self.journal.pull([data['history']['source_account']]);self.assertEqual([e['entity'] for e in events],['request']);self.assertNotIn('Private website text',json.dumps(events))
 def test_journal_failure_is_visible_without_faking_a_saved_reply(self):
  def fail(*args):raise OSError('fixture disk full')
  self.journal.record=fail;code,data=self.req('/v1/chat',{'model':self.model,'message':'Hi'});self.assertEqual(code,200);self.assertIn('history_warning',data);self.assertNotIn('fixture disk full',json.dumps(data))
 def test_unknown_models_do_not_generate_fake_assistant_messages(self):
  code,data=self.req('/v1/chat',{'model':'missing','message':'test'});self.assertEqual(code,422);events=self.journal.pull([data['history']['source_account']]);self.assertEqual([e['entity'] for e in events],['request'])
if __name__=='__main__':unittest.main()
