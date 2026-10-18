import importlib.util,sys,tempfile,types,unittest,uuid,json
from pathlib import Path
from fastapi import FastAPI,HTTPException,Request
from fastapi.testclient import TestClient
P=Path(__file__).resolve().parent;sys.path[:0]=[str(P),'/opt/cridergpt-engine']
from native_chat_integration.store import Store
from replica import Replica
package=types.ModuleType('history_sync');package.__path__=[str(P)];sys.modules['history_sync']=package
spec=importlib.util.spec_from_file_location('history_sync.local_routes',P/'local_routes.py');routes=importlib.util.module_from_spec(spec);spec.loader.exec_module(routes)
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.store=Store(Path(self.tmp.name)/'db.sqlite');self.replica=Replica(self.store.path)
  def auth(request:Request):
   value=request.headers.get('x-fixture-account')
   if not value:raise HTTPException(401)
   return value
  app=FastAPI();app.include_router(routes.make_router(auth,lambda:self.store));self.client=TestClient(app)
 def tearDown(self):self.tmp.cleanup()
 def test_requires_authentication(self):self.assertEqual(self.client.get('/local-chat/sync/status').status_code,401)
 def test_memory_scope_and_unverified_status(self):
  with self.replica.connection() as c:
   c.execute('INSERT INTO external_sync_memories VALUES(?,?,?,?,?)',('source','id','owner','Owner only',json.dumps({'verified':False})))
  owner=self.client.get('/local-chat/sync/memories',headers={'x-fixture-account':'owner'}).json();other=self.client.get('/local-chat/sync/memories',headers={'x-fixture-account':'other'}).json();self.assertEqual(owner['items'][0]['content'],'Owner only');self.assertEqual(other['items'],[])
 def test_training_review_is_owner_only_and_never_approved(self):
  self.assertEqual(self.client.get('/local-chat/sync/training-review',headers={'x-fixture-account':'other'}).status_code,403);self.assertFalse(self.client.get('/local-chat/sync/training-review',headers={'x-fixture-account':'owner'}).json()['approved'])
if __name__=='__main__':unittest.main()
