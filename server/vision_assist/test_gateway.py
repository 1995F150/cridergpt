import importlib.util,os,sys,threading,json,urllib.request,urllib.error,unittest
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/home/cridergpt2026/cridergpt-chat-api')
sys.path[:0]=[str(P),str(ROOT)];os.environ['CRIDERGPT_API_ROOT']=str(ROOT)
import bridge
sys.modules['vision_bridge']=bridge
spec=importlib.util.spec_from_file_location('staged_gateway',P/'stage/server.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.with_vision=lambda model,messages,image,generate:bridge.with_vision(model,messages,image,generate,lambda value:{'observation':'A red square','vision_helper':'fixture-vision'})
class Tests(unittest.TestCase):
 def setUp(self):
  self.calls=[];self.model=next(iter(module.models()))
  def generate(model,messages):self.calls.append(messages);return {'model':model,'response':'Red square','weights_sha256':module.models()[model]['sha256']}
  self.s=module.API(('127.0.0.1',0),'k'*48,generate=generate);self.t=threading.Thread(target=self.s.serve_forever,daemon=True);self.t.start()
 def tearDown(self):self.s.shutdown();self.s.server_close();self.t.join()
 def request(self,body,key='k'*48):
  req=urllib.request.Request('http://127.0.0.1:'+str(self.s.server_port)+'/v1/chat',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_same_api_preserves_model_and_exposes_helper(self):
  code,data=self.request({'model':self.model,'message':'Describe this image','image_base64':'fixture'})
  self.assertEqual(code,200);self.assertEqual(data['model'],self.model);self.assertTrue(data['vision_assisted']);self.assertEqual(data['vision_helper'],'fixture-vision');self.assertIn('A red square',self.calls[0][-1]['content'])
 def test_auth_still_required(self):
  self.assertEqual(self.request({'model':self.model,'message':'describe','image_base64':'fixture'},'bad')[0],401);self.assertEqual(self.calls,[])
 def test_text_only_has_no_vision_label(self):
  code,data=self.request({'model':self.model,'message':'hello'});self.assertEqual(code,200);self.assertNotIn('Image analyzed',data['response'])
if __name__=='__main__':unittest.main()
