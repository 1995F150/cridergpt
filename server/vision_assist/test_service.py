"""Exercise the real private Unix transport without loading model weights."""
import importlib.util,json,sys,tempfile,threading,unittest
from pathlib import Path
from unittest.mock import patch
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P))
import bridge
sys.modules['vision_bridge']=bridge
spec=importlib.util.spec_from_file_location('private_vision_service',P/'service.py');service=importlib.util.module_from_spec(spec);spec.loader.exec_module(service)
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'worker.sock'
  self.server=service.Server(str(self.path),service.Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.patch=patch.object(bridge,'SOCKET',self.path);self.patch.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.patch.stop();self.temp.cleanup()
 def test_image_and_question_cross_private_socket(self):
  calls=[]
  def recognize(value,question):calls.append((value,question));return {'observation':'A red square','vision_helper':'fixture'}
  with patch.object(service,'analyze_local',side_effect=recognize):result=bridge.analyze('fixture','What is visible?')
  self.assertEqual(calls,[('fixture','What is visible?')]);self.assertEqual(result['observation'],'A red square')
 def test_worker_timeout_is_not_a_success(self):
  with patch.object(service,'analyze_local',side_effect=TimeoutError):
   with self.assertRaises(TimeoutError):bridge.analyze('fixture','Describe')
 def test_worker_error_never_uses_external_fallback(self):
  with patch.object(service,'analyze_local',side_effect=RuntimeError('private input')):
   with self.assertRaises(RuntimeError) as error:bridge.analyze('fixture','Describe')
  self.assertNotIn('private input',str(error.exception))
 def test_malformed_request_rejected_before_worker(self):
  with patch.object(service,'analyze_local') as worker:
   c=bridge.VisionConnection('localhost',timeout=2);c.request('POST','/analyze',body=json.dumps({'image_base64':'fixture'}));r=c.getresponse();r.read();c.close()
   self.assertEqual(r.status,400);worker.assert_not_called()
 def test_unconfigured_socket_fails_instead_of_running_in_gateway(self):
  with patch.object(bridge,'SOCKET',self.path.with_name('absent')),patch.object(bridge.subprocess,'run') as heavy:
   with self.assertRaises(OSError):bridge.analyze('fixture','Describe')
   heavy.assert_not_called()
if __name__=='__main__':unittest.main()
