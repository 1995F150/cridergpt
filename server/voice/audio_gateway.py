"""Same-origin audio routes for the existing authenticated Python API.

Called only AFTER normal API authentication. Delegated user headers require the
existing server master key; ordinary generated API keys cannot assert an owner.
No public listener, shared operator voice key or external speech fallback.
"""
import hashlib
import hmac
import http.client
import json
import os
from pathlib import Path
import re
import socket
import threading
import time
from auth import AuthStore


class AudioError(Exception):
    def __init__(self,status,message):self.status=status;self.message=message


class UnixConnection(http.client.HTTPConnection):
    def __init__(self,path):super().__init__('localhost',timeout=12);self.path=str(path)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect(self.path)


class AudioGateway:
    def __init__(self,root=None,requester=None):
        self.root=Path(root or Path.home()/'cridergpt-voice');self.lock=threading.Lock();self.slots=threading.BoundedSemaphore(2);self.requester=requester or self.request
        self.socket=Path('/run/user')/str(os.getuid())/'cridergpt-voice/api.sock'

    def credential(self,user):
        # Each verified application user gets separate private worker ownership.
        owner='web_'+user
        with self.lock:
            directory=self.root/'state/gateway-keys';directory.mkdir(mode=0o700,exist_ok=True)
            path=directory/(hashlib.sha256(owner.encode()).hexdigest()+'.json')
            if path.is_symlink():raise AudioError(503,'Unsafe voice credential state')
            store=AuthStore(self.root/'state')
            try:
                if path.exists():
                    saved=json.loads(path.read_text())
                    row=store.db.execute('SELECT revoked FROM keys WHERE digest=?',(hashlib.sha256(saved['token'].encode()).hexdigest(),)).fetchone()
                    if not row or row[0]:raise AudioError(403,'Voice access revoked')
                    if time.time()<saved['expires']:return saved['token']
                    store.revoke(saved['token'])
                elif len(list(directory.glob('*.json')))>=1000:raise AudioError(503,'Voice account capacity reached')
                token=store.issue(owner,'Unified API voice',{'status','stt','tts','voices:read'},days=90)
                temporary=path.with_suffix('.tmp')
                with temporary.open('x') as stream:stream.write(json.dumps({'token':token,'expires':time.time()+89*86400}))
                temporary.chmod(0o600);temporary.replace(path)
                return token
            finally:store.close()

    def request(self,token,method,path,body=None):
        conn=UnixConnection(self.socket)
        try:
            conn.request(method,path,None if body is None else json.dumps(body).encode(),{'Authorization':'Bearer '+token,'Content-Type':'application/json'})
            response=conn.getresponse();raw=response.read(3_200_001)
            if len(raw)>3_200_000:raise AudioError(502,'Audio response exceeds its bounded size')
            if response.status>=400:
                status=response.status if response.status in (400,401,403,404,413,429,503,504) else 502
                raise AudioError(status,'Local audio request unavailable; retry or check selected voice')
            return json.loads(raw)
        except (OSError,ValueError,http.client.HTTPException):raise AudioError(503,'Local voice service unavailable; no fallback') from None
        finally:conn.close()

    def catalog(self,token):
        status=self.requester(token,'GET','/v1/status')
        records=self.requester(token,'GET','/v1/voices')['voices']
        ready='piper-ljspeech-medium' in status.get('models',[])
        voices=status.get('stock_voices')
        if voices is None:voices=[{'id':'stock','name':'LJ Speech — local standard voice','provider':'local','model':'piper-ljspeech-medium','kind':'stock','available':ready}]
        voices=[dict(row) for row in voices if row.get('kind')=='stock' and row.get('provider')=='local']
        voices.extend({'id':row['id'],'name':row['label'],'provider':'local','model':'openvoice-v2+piper-ljspeech-medium','kind':'owned_reference','available':ready} for row in records)
        return {'voices':voices,'transcription':{'model':'whisper-tiny.en','available':'whisper-tiny.en' in status.get('models',[])},'busy':status.get('busy') is True,
                'limits':{'audio_bytes':2*1024*1024,'utterance_seconds':30,'speech_characters':300,'speech_parts':8},
                'external_fallback':False,'catalog_version':1}

    def handle(self,handler,master_key):
        path=handler.path
        if not path.startswith('/v1/audio/'):return False
        if not self.slots.acquire(False):
            handler.reply(429,{'error':{'message':'Audio gateway busy; retry shortly'}});return True
        try:
            # The Edge gateway sets this from verified getUser(), never the body.
            provided=handler.headers.get('Authorization','')
            if not hmac.compare_digest(provided,'Bearer '+master_key):raise AudioError(403,'Delegated audio requires the trusted application gateway')
            user=handler.headers.get('X-CriderGPT-User','')
            if not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',user):raise AudioError(401,'Verified application identity required')
            if handler.command=='GET' and path=='/v1/audio/voices':
                result=self.catalog(self.credential(user));handler.reply(200,result);return True
            match=re.fullmatch(r'/v1/audio/jobs/([0-9a-f-]{36})(/cancel)?',path)
            if handler.command=='POST' and path=='/v1/audio/jobs':
                if handler.headers.get('Transfer-Encoding') or handler.headers.get('Content-Type','').split(';')[0]!='application/json':raise AudioError(400,'JSON Content-Length required')
                size=int(handler.headers.get('Content-Length','0'))
                if not 0<size<=2_800_000:raise AudioError(413,'Audio request too large')
                raw=handler.rfile.read(size)
                if len(raw)!=size:raise AudioError(400,'Interrupted audio request')
                body=json.loads(raw)
                if not isinstance(body,dict):raise AudioError(400,'Invalid audio request')
                allowed={'operation','audio'} if body.get('operation')=='transcribe' else {'operation','text','voice_id'}
                if set(body)-allowed or body.get('operation') not in ('transcribe','speech'):raise AudioError(400,'Unsupported audio fields or operation')
                if body.get('operation')=='speech':
                    selected=body.get('voice_id');voices=self.catalog(self.credential(user))['voices']
                    if not any(v['id']==selected and v['available'] for v in voices):raise AudioError(422,'Selected voice is unavailable; no substitution')
                handler.reply(202,self.requester(self.credential(user),'POST','/v1/jobs',body));return True
            if match and ((handler.command=='GET' and not match[2]) or (handler.command=='POST' and match[2])):
                handler.reply(200,self.requester(self.credential(user),handler.command,'/v1/jobs/'+match[1]+(match[2] or ''),{} if match[2] else None));return True
            raise AudioError(404,'Unknown audio endpoint')
        except AudioError as error:handler.reply(error.status,{'error':{'message':error.message}})
        except (ValueError,TypeError,KeyError):handler.reply(400,{'error':{'message':'Invalid audio request'}})
        except Exception:handler.reply(503,{'error':{'message':'Local audio gateway unavailable'}})
        finally:self.slots.release()
        return True
