"""Unix-socket voice API. Owner-scoped jobs, real subprocess cancellation, no providers."""
import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass,field
import hashlib
import base64
import json
import logging
import os
from pathlib import Path
import signal
import sqlite3
import sys
import time
import uuid
import wave

from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import HTMLResponse,Response
from auth import AuthStore
from enrollment import VoiceRegistry

ROOT=Path(os.environ.get('CRIDER_VOICE_ROOT',Path.home()/'cridergpt-voice'))
LOG=logging.getLogger('crider-voice')

@dataclass
class Job:
 id:str
 owner:str
 operation:str
 voice_id:str|None=None
 status:str='queued'
 result:dict|None=None
 task:asyncio.Task|None=None
 created:float=field(default_factory=time.time)

class EngineManager:
 def __init__(self):self.process=None;self.active=None;self.ready=False;self.clear_after_job=False
 async def warm(self):
  if self.process and self.process.returncode is None and self.ready:return
  self.process=await asyncio.create_subprocess_exec(sys.executable,str(Path(__file__).with_name('worker.py')),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=None,limit=24*1024*1024,start_new_session=True)
  try:
   hello=json.loads(await asyncio.wait_for(self.process.stdout.readline(),90))
   if not hello.get('ready'):raise RuntimeError('worker_not_ready')
   self.ready=True
  except BaseException:
   await self.stop();raise
 async def stop(self):
  process=self.process;self.process=None;self.ready=False
  if process and process.returncode is None:
   try:os.killpg(process.pid,signal.SIGTERM)
   except ProcessLookupError:pass
   try:await asyncio.wait_for(process.wait(),3)
   except asyncio.TimeoutError:
    try:os.killpg(process.pid,signal.SIGKILL)
    except ProcessLookupError:pass
    await process.wait()
 async def run(self,payload):
  try:
   await self.warm()
   self.process.stdin.write(json.dumps(payload).encode()+b'\n');await self.process.stdin.drain()
   line=await asyncio.wait_for(self.process.stdout.readline(),45)
   if not line:raise RuntimeError('transport_interruption')
   result=json.loads(line)
   if result.get('error')=='internal_error':raise RuntimeError('inference_error')
   return result
  except BaseException:
   await self.stop();raise

async def read_json(request):
 size=0;chunks=[]
 async for chunk in request.stream():
  size+=len(chunk)
  if size>17*1024*1024:raise HTTPException(413,'Request too large')
  chunks.append(chunk)
 try:
  body=json.loads(b''.join(chunks))
  if not isinstance(body,dict):raise ValueError()
  return body
 except (ValueError,UnicodeError):raise HTTPException(400,'Invalid JSON')

def audio_bytes(body,limit):
 try:
  encoded=body.get('audio')
  if not isinstance(encoded,str) or len(encoded)>limit*4//3+8:raise ValueError()
  raw=base64.b64decode(encoded,validate=True)
  if len(raw)>limit:raise ValueError()
  return raw
 except (ValueError,TypeError):raise HTTPException(400,'Invalid or oversized base64 audio')

def create_app(manager=None,state_root=None):
 state=Path(state_root or ROOT/'state');jobs={};engine=manager or EngineManager()
 @asynccontextmanager
 async def lifespan(app):
  state.mkdir(parents=True,exist_ok=True,mode=0o700)
  app.state.auth=AuthStore(state)
  app.state.registry=VoiceRegistry(state/'voices')
  app.state.audit=sqlite3.connect(state/'events.sqlite3')
  (state/'events.sqlite3').chmod(0o600)
  app.state.audit.execute('CREATE TABLE IF NOT EXISTS events (request_id TEXT,owner_hash TEXT,operation TEXT,status TEXT,duration_ms INTEGER,created REAL)');app.state.audit.commit()
  await engine.warm()
  async def expire_private_results():
   while True:
    await asyncio.sleep(10)
    for identifier,job in list(jobs.items()):
     if job.status not in ('queued','running') and time.time()-job.created>120:
      job.result=None;del jobs[identifier]
    app.state.audit.execute('DELETE FROM events WHERE created<?',(time.time()-30*86400,));app.state.audit.commit()
  cleaner=asyncio.create_task(expire_private_results())
  try:yield
  finally:
   cleaner.cancel();await asyncio.gather(cleaner,return_exceptions=True)
   for job in jobs.values():
    if job.task and not job.task.done():job.task.cancel()
   await asyncio.gather(*(j.task for j in jobs.values() if j.task),return_exceptions=True)
   await engine.stop();app.state.auth.close();app.state.registry.close();app.state.audit.close()
 app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)
 def actor(request,scope):
  header=request.headers.get('authorization','')
  owner=app.state.auth.verify(header[7:] if header.startswith('Bearer ') else '',scope)
  if owner is None:raise HTTPException(401,'A valid scoped voice key is required')
  return owner
 def owned(identifier,owner):
  job=jobs.get(identifier)
  if not job or job.owner!=owner:raise HTTPException(404,'Job not found')
  if job.status not in ('queued','running') and time.time()-job.created>120:
   del jobs[identifier];raise HTTPException(404,'Job expired')
  return job
 def audit(job):
  duration=round((time.time()-job.created)*1000)
  app.state.audit.execute('INSERT INTO events VALUES(?,?,?,?,?,?)',(job.id,hashlib.sha256(job.owner.encode()).hexdigest(),job.operation,job.status,duration,time.time()))
  app.state.audit.execute('DELETE FROM events WHERE created<?',(time.time()-30*86400,));app.state.audit.commit()
  LOG.info(json.dumps({'request_id':job.id,'operation':job.operation,'status':job.status,'latency_ms':duration}))
 async def execute(job,payload):
  job.status='running'
  try:
   result=await engine.run(payload)
   job.result=result;job.status='failed' if result.get('error') else 'incomplete' if result.get('incomplete') else 'completed'
  except asyncio.CancelledError:job.status='cancelled';job.result=None
  except asyncio.TimeoutError:job.status='timeout';job.result=None
  except Exception:job.status='failed';job.result=None
  finally:
   if getattr(engine,'clear_after_job',False):
    await engine.stop();engine.clear_after_job=False
   engine.active=None;audit(job)
 async def cancel_job(job):
  if job.task and not job.task.done():
   job.task.cancel();await asyncio.gather(job.task,return_exceptions=True)
  if job.status in ('queued','running'):
   await engine.stop();engine.active=None;job.status='cancelled';audit(job)
  job.result=None
 def submit(owner,operation,payload,voice_id=None):
  now=time.time()
  for identifier,job in list(jobs.items()):
   if job.status not in ('running','queued') and now-job.created>120:del jobs[identifier]
  if engine.active or len(jobs)>=20:raise HTTPException(429,'Voice worker is busy. Retry after the current job.')
  count=app.state.audit.execute('SELECT COUNT(*) FROM events WHERE owner_hash=? AND created>?',(hashlib.sha256(owner.encode()).hexdigest(),now-60)).fetchone()[0]
  if count>=10:raise HTTPException(429,'Voice rate limit reached. Retry in a minute.')
  job=Job(str(uuid.uuid4()),owner,operation,voice_id);jobs[job.id]=job;engine.active=job.id
  job.task=asyncio.create_task(execute(job,payload));return job
 @app.get('/health')
 async def health():return {'service':'cridergpt-voice','ready':engine.ready,'public_chat_connected':False}
 @app.get('/')
 async def page():return HTMLResponse(Path(__file__).with_name('web.html').read_text(),headers={'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'",'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
 @app.get('/v1/status')
 async def status(request:Request):
  actor(request,'status')
  return {'ready':engine.ready,'busy':bool(engine.active),'models':['whisper-tiny.en','piper-ljspeech-medium','openvoice-v2'],'cloning_requires_enrolled_reference':True,'external_fallback':False,'public_chat_connected':False,'production_ready':False}
 @app.post('/v1/jobs',status_code=202)
 async def start(request:Request):
  # Auth before parsing potentially large audio bodies.
  body=None;header=request.headers.get('authorization','');token=header[7:] if header.startswith('Bearer ') else ''
  if not any(app.state.auth.verify(token,scope) for scope in ('stt','tts')):raise HTTPException(401,'A scoped voice key is required')
  body=await read_json(request);operation=body.get('operation')
  if operation=='transcribe':
   owner=actor(request,'stt');raw=audio_bytes(body,2*1024*1024)
   payload={'operation':operation,'audio':base64.b64encode(raw).decode()};voice_id=None
  elif operation=='speech':
   owner=actor(request,'tts');text=body.get('text')
   if not isinstance(text,str) or not text.strip() or len(text)>300:raise HTTPException(400,'Use 1–300 characters for a speech preview')
   voice_id=body.get('voice_id');payload={'operation':operation,'text':text}
   if voice_id is not None and not isinstance(voice_id,str):raise HTTPException(400,'Invalid voice identifier')
   if voice_id and voice_id!='stock':
    try:payload['reference']=str(app.state.registry.reference(owner,voice_id))
    except (KeyError,ValueError):raise HTTPException(404,'Voice not found')
  else:raise HTTPException(400,'Unsupported operation')
  job=submit(owner,operation,payload,voice_id)
  return {'id':job.id,'status':job.status}
 @app.get('/v1/jobs/{identifier}')
 async def inspect_job(identifier:str,request:Request):
  # Either inference scope can inspect only its owner's jobs.
  header=request.headers.get('authorization','');token=header[7:] if header.startswith('Bearer ') else ''
  owner=app.state.auth.verify(token,'stt') or app.state.auth.verify(token,'tts')
  if owner is None:raise HTTPException(401,'A scoped voice key is required')
  job=owned(identifier,owner)
  actor(request,'tts' if job.operation=='speech' else 'stt')
  return {'id':job.id,'status':job.status,'result':job.result,'error':None if job.status in ('queued','running','completed') else job.status}
 @app.post('/v1/jobs/{identifier}/cancel')
 async def cancel(identifier:str,request:Request):
  header=request.headers.get('authorization','');token=header[7:] if header.startswith('Bearer ') else ''
  owner=app.state.auth.verify(token,'stt') or app.state.auth.verify(token,'tts')
  if owner is None:raise HTTPException(401,'A scoped voice key is required')
  job=owned(identifier,owner)
  actor(request,'tts' if job.operation=='speech' else 'stt')
  await cancel_job(job)
  return {'id':job.id,'status':job.status}
 @app.get('/v1/voices')
 async def voices(request:Request):return {'voices':app.state.registry.list(actor(request,'voices:read'))}
 @app.post('/v1/voices',status_code=201)
 async def enroll(request:Request):
  owner=actor(request,'voices:enroll')
  if len(app.state.registry.list(owner))>=10 or app.state.registry.db.execute('SELECT COUNT(*) FROM voices WHERE revoked IS NULL').fetchone()[0]>=50:raise HTTPException(429,'Voice reference limit reached; revoke an unused reference')
  body=await read_json(request);raw=audio_bytes(body,12*1024*1024)
  try:identifier,metadata=app.state.registry.enroll(raw,owner,body.get('label',''),body.get('consent',''),body.get('evidence',''))
  except (ValueError,TypeError,AttributeError,EOFError,wave.Error):raise HTTPException(400,'Use clean mono PCM16 WAV, 6–120 seconds, with a label and explicit consent evidence')
  job=Job(str(uuid.uuid4()),owner,'voice_enroll',identifier,status='completed');audit(job)
  return {'id':identifier,'metadata':metadata}
 @app.delete('/v1/voices/{identifier}')
 async def revoke(identifier:str,request:Request):
  owner=actor(request,'voices:revoke')
  try:app.state.registry.reference(owner,identifier)
  except (ValueError,KeyError):raise HTTPException(404,'Voice not found')
  for job in list(jobs.values()):
   if job.owner==owner and job.voice_id==identifier:
    await cancel_job(job)
  # Drop all cached speaker embeddings, including an idle worker's cache.
  if engine.active:engine.clear_after_job=True
  else:await engine.stop()
  app.state.registry.revoke(owner,identifier)
  job=Job(str(uuid.uuid4()),owner,'voice_revoke',identifier,status='completed');audit(job)
  return {'revoked':True}
 return app

app=create_app()
if __name__=='__main__':
 import uvicorn
 socket=Path(os.environ.get('XDG_RUNTIME_DIR','/tmp'))/'cridergpt-voice/api.sock'
 socket.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 uvicorn.run(app,uds=str(socket),access_log=False,log_level='info')
