import importlib.util,json,os,sys,threading,unittest,urllib.request,urllib.error
from pathlib import Path
P=Path(__file__).resolve().parent
API_ROOT='/home/cridergpt2026/cridergpt-chat-api'
sys.path.insert(0,API_ROOT)
os.environ['CRIDERGPT_API_ROOT']=API_ROOT
spec=importlib.util.spec_from_file_location('isolated_gateway',P/'stage/server.py');gateway=importlib.util.module_from_spec(spec);spec.loader.exec_module(gateway)
class GatewayTests(unittest.TestCase):
 def setUp(self):
  self.calls=[]
  def generate(model,messages):
   self.calls.append((model,messages))
   return dict(model=model,weights_sha256=gateway.models()[model]['sha256'],response='answer '+messages[-1]['content'],request_id=str(len(self.calls)))
  self.server=gateway.API(('127.0.0.1',0),'fixture',generate=generate,key_validator=lambda k:False)
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join()
 def req(self,model,message):
  request=urllib.request.Request('http://127.0.0.1:'+str(self.server.server_port)+'/v1/chat',data=json.dumps(dict(model=model,message=message,routing='text')).encode(),headers={'Authorization':'Bearer fixture','Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(request) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_unrelated_requests_and_model_switch_not_cached(self):
  models=list(gateway.models());a='andromeda-3.0-360m-100';b=next(m for m in models if m!=a)
  with self.assertLogs('cridergpt.request_audit',level='INFO') as logs:
   responses=[self.req(model,prompt)[1] for model,prompt in [(a,'private greeting'),(b,'private sky'),(a,'private math')]]
  self.assertEqual([r['response'] for r in responses],['answer private greeting','answer private sky','answer private math'])
  self.assertEqual([r['model'] for r in responses],[a,b,a]);self.assertEqual(len({r['request_id'] for r in responses}),3)
  events=[json.loads(r.getMessage()) for r in logs.records]
  self.assertEqual(len({e['prompt_sha256'] for e in events}),3);self.assertEqual(len({e['response_sha256'] for e in events}),3)
  self.assertTrue(all(e['checkpoint_sha256'] for e in events));self.assertNotIn('private ',str(logs.output))
 def test_wrong_checkpoint_never_displayed(self):
  self.server.generate=lambda *args:dict(model=args[0],weights_sha256='wrong',response='stale')
  status,response=self.req('andromeda-3.0-360m-100','fixture')
  self.assertEqual(status,502);self.assertNotIn('response',response)
