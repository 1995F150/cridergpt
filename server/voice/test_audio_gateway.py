import io
import json
from pathlib import Path
import tempfile
import unittest
from fastapi.testclient import TestClient
from audio_gateway import AudioGateway
from service import create_app
from test_service import FakeEngine
from enrollment import VoiceRegistry
from test_enrollment import fixture

ALICE='11111111-1111-4111-8111-111111111111'
BOB='22222222-2222-4222-8222-222222222222'
class Handler:
    def __init__(self,path,method='GET',user=ALICE,key='master',body=None):
        self.path=path;self.command=method;raw=json.dumps(body).encode() if body is not None else b''
        self.headers={'Authorization':'Bearer '+key,'X-CriderGPT-User':user,'Content-Type':'application/json','Content-Length':str(len(raw))};self.rfile=io.BytesIO(raw)
    def reply(self,status,body):self.status=status;self.result=body

class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.engine=FakeEngine()
        self.client=TestClient(create_app(self.engine,self.root/'state'));self.client.__enter__()
        def request(token,method,path,body=None):
            from audio_gateway import AudioError
            response=self.client.request(method,path,json=body,headers={'Authorization':'Bearer '+token})
            if response.status_code>=400:raise AudioError(response.status_code,'Fixture worker rejected request')
            return response.json()
        self.gateway=AudioGateway(self.root,request)
    def tearDown(self):self.client.__exit__(None,None,None);self.tmp.cleanup()
    def request(self,*args,**kwargs):
        handler=Handler(*args,**kwargs);self.assertTrue(self.gateway.handle(handler,'master'));return handler
    def test_gateway_response_concurrency_is_bounded(self):
        self.gateway.slots.acquire();self.gateway.slots.acquire()
        try:self.assertEqual(self.request('/v1/audio/voices').status,429)
        finally:self.gateway.slots.release();self.gateway.slots.release()
        self.assertEqual(self.request('/v1/audio/voices').status,200)
    def test_master_key_and_verified_identity_required(self):
        self.assertEqual(self.request('/v1/audio/voices',key='ordinary-key').status,403)
        self.assertEqual(self.request('/v1/audio/voices',user='').status,401)
        self.assertFalse((self.root/'state/gateway-keys').exists())
    def test_catalog_exposes_only_callers_references(self):
        registry=VoiceRegistry(self.root/'state/voices')
        voice,_=registry.enroll(fixture(),'web_'+ALICE,'Owned voice','self','Fixture explicit permission');registry.close()
        alice=self.request('/v1/audio/voices');bob=self.request('/v1/audio/voices',user=BOB)
        self.assertEqual(alice.status,200);self.assertEqual({v['id'] for v in alice.result['voices']},{'stock',voice})
        self.assertEqual([v['id'] for v in bob.result['voices']],['stock'])
        self.assertNotIn('cv_',json.dumps(alice.result));self.assertFalse(alice.result['external_fallback'])
    def test_invalid_or_foreign_voice_is_not_substituted(self):
        response=self.request('/v1/audio/jobs','POST',body={'operation':'speech','text':'Hi','voice_id':'unavailable'})
        self.assertEqual(response.status,422);self.assertEqual(self.engine.calls,[])
    def test_jobs_remain_owner_scoped(self):
        self.engine.delay=5
        response=self.request('/v1/audio/jobs','POST',body={'operation':'speech','text':'Hi','voice_id':'stock'})
        self.assertEqual(response.status,202);path='/v1/audio/jobs/'+response.result['id']
        self.assertEqual(self.request(path,user=BOB).status,404)
        self.assertEqual(self.request(path+'/cancel','POST',user=BOB).status,404)
        self.assertEqual(self.request(path+'/cancel','POST').result['status'],'cancelled')
    def test_body_owner_and_unknown_operations_are_rejected(self):
        response=self.request('/v1/audio/jobs','POST',body={'operation':'transcribe','audio':'Zg==','owner':BOB})
        self.assertEqual(response.status,400)
        self.assertEqual(self.request('/v1/audio/jobs','POST',body={'operation':'remote_url'}).status,400)
    def test_revoked_broker_credentials_are_not_reissued(self):
        self.assertEqual(self.request('/v1/audio/voices').status,200)
        from auth import AuthStore
        saved=json.loads(next((self.root/'state/gateway-keys').glob('*.json')).read_text())
        store=AuthStore(self.root/'state');store.revoke(saved['token']);store.close()
        self.assertEqual(self.request('/v1/audio/voices').status,403)
    def test_explicit_empty_stock_catalog_is_not_replaced(self):
        gateway=AudioGateway(self.root,lambda token,method,path,body=None: {'models':['piper-ljspeech-medium'],'stock_voices':[]} if path=='/v1/status' else {'voices':[]})
        self.assertEqual(gateway.catalog('fixture')['voices'],[])
    def test_new_backend_stock_id_does_not_require_a_gateway_menu_edit(self):
        voice={'id':'piper:another-installed-voice','name':'New backend name','model':'new-model','provider':'local','kind':'stock','available':True}
        gateway=AudioGateway(self.root,lambda token,method,path,body=None: {'models':[],'stock_voices':[voice]} if path=='/v1/status' else {'voices':[]})
        self.assertEqual(gateway.catalog('fixture')['voices'],[voice])
    def test_cold_worker_can_be_selected_for_warm_on_demand(self):
        self.engine.ready=False
        response=self.request('/v1/audio/voices')
        self.assertTrue(response.result['voices'][0]['available'])

if __name__=='__main__':unittest.main()
