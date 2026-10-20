import asyncio
import base64
import json
from pathlib import Path
import sqlite3
import tempfile
import time
import unittest
from fastapi.testclient import TestClient
from auth import AuthStore,SCOPES
from service import create_app
from test_enrollment import fixture

class FakeEngine:
 def __init__(self):self.ready=False;self.active=None;self.delay=0;self.calls=[];self.stops=0
 async def warm(self):self.ready=True
 async def stop(self):self.ready=False;self.stops+=1
 async def run(self,payload):
  await self.warm();self.calls.append(payload)
  try:await asyncio.sleep(self.delay)
  except BaseException:await self.stop();raise
  return {'audio':'Zml4dHVyZQ==','model':'fixture','finish_reason':'completed','cloned':'reference' in payload}

class Tests(unittest.TestCase):
 def setUp(self):
  self.directory=tempfile.TemporaryDirectory();self.state=Path(self.directory.name)/'state';store=AuthStore(self.state)
  self.alice=store.issue('alice','fixture',SCOPES);self.bob=store.issue('bob','fixture',SCOPES);self.stt=store.issue('alice','transcription only',{'stt'});self.revoked=store.issue('alice','revoked',SCOPES);store.revoke(self.revoked);store.close()
  self.engine=FakeEngine();self.client=TestClient(create_app(self.engine,self.state));self.client.__enter__()
 def tearDown(self):self.client.__exit__(None,None,None);self.directory.cleanup()
 def auth(self,token=None):return {'Authorization':'Bearer '+(token or self.alice)}
 def enroll(self,token=None):return self.client.post('/v1/voices',headers=self.auth(token),json={'audio':base64.b64encode(fixture()).decode(),'label':'Reference','consent':'self','evidence':'Generated fixture permission for isolated tests'})
 def start(self,body,token=None):return self.client.post('/v1/jobs',headers=self.auth(token),json=body)
 def wait(self,identifier):
  for _ in range(100):
   response=self.client.get('/v1/jobs/'+identifier,headers=self.auth()).json()
   if response['status'] not in ['running','queued']:return response
   time.sleep(.01)
  self.fail('Fixture job did not finish')
 def test_auth_before_audio_parsing_and_revocation(self):
  self.assertEqual(self.client.post('/v1/jobs',content=b'not json').status_code,401)
  self.assertEqual(self.client.get('/v1/status',headers=self.auth(self.revoked)).status_code,401)
  self.assertEqual(self.start({'operation':'speech','text':'hello'},self.stt).status_code,401)
 def test_owner_isolation_and_no_requested_owner_trust(self):
  voice=self.enroll().json()['id']
  self.assertEqual(self.client.get('/v1/voices',headers=self.auth(self.bob)).json(),{'voices':[]})
  self.assertEqual(self.start({'operation':'speech','text':'hello','voice_id':voice,'owner':'alice'},self.bob).status_code,404)
  self.assertEqual(self.client.delete('/v1/voices/'+voice,headers=self.auth(self.bob)).status_code,404)
 def test_consent_audio_and_body_limits(self):
  self.assertEqual(self.client.post('/v1/voices',headers=self.auth(),json={'audio':base64.b64encode(fixture()).decode(),'label':'no consent'}).status_code,400)
  self.assertEqual(self.client.post('/v1/voices',headers=self.auth(),json={'audio':'bm90IHdhdg==','consent':'self','label':'x','evidence':'test'}).status_code,400)
  self.assertEqual(self.start({'operation':'speech','text':'x'*301}).status_code,400)
  self.assertEqual(self.client.post('/v1/jobs',headers=self.auth(),content=b' '*(17*1024*1024+1)).status_code,413)
 def test_voice_preview_and_revocation(self):
  voice=self.enroll().json()['id'];created=self.start({'operation':'speech','text':'hello','voice_id':voice})
  self.assertEqual(created.status_code,202);result=self.wait(created.json()['id']);self.assertTrue(result['result']['cloned'])
  self.assertEqual(self.client.delete('/v1/voices/'+voice,headers=self.auth()).status_code,200)
  self.assertFalse((self.state/'voices'/(voice+'.wav')).exists())
  self.assertEqual(self.start({'operation':'speech','text':'hello','voice_id':voice}).status_code,404)
  self.assertIsNone(self.client.get('/v1/jobs/'+created.json()['id'],headers=self.auth()).json()['result'])
 def test_cancellation_busy_recovery_and_cross_owner(self):
  self.engine.delay=5;identifier=self.start({'operation':'speech','text':'hello'}).json()['id']
  self.assertEqual(self.start({'operation':'speech','text':'overlap'}).status_code,429)
  self.assertEqual(self.client.post('/v1/jobs/'+identifier+'/cancel',headers=self.auth(self.bob)).status_code,404)
  self.assertEqual(self.client.post('/v1/jobs/'+identifier+'/cancel',headers=self.auth()).json()['status'],'cancelled')
  self.engine.delay=0;again=self.start({'operation':'speech','text':'recovered'}).json()['id'];self.assertEqual(self.wait(again)['status'],'completed')
 def test_scope_checks_apply_to_results(self):
  identifier=self.start({'operation':'speech','text':'hello'}).json()['id'];self.wait(identifier)
  self.assertEqual(self.client.get('/v1/jobs/'+identifier,headers=self.auth(self.stt)).status_code,401)
 def test_audit_contains_no_text_audio_keys_or_consent(self):
  identifier=self.start({'operation':'speech','text':'PRIVATE_VOICE_TEXT'}).json()['id'];self.wait(identifier)
  with sqlite3.connect(self.state/'events.sqlite3') as db:rows=str(db.execute('SELECT * FROM events').fetchall())
  self.assertNotIn('PRIVATE_VOICE_TEXT',rows);self.assertNotIn(self.alice,rows);self.assertNotIn('Zml4dHVyZQ',rows)

if __name__=='__main__':unittest.main()
