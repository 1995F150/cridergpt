"""Create a reviewable gateway patch; does not modify the running API source."""
from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;target=Path('/home/cridergpt2026/cridergpt-chat-api/server.py');s=target.read_text();original=s
s=s.replace('from engine_keys import validate_engine_key,EngineUnavailable','from engine_keys import validate_engine_key,EngineUnavailable\nfrom gateway_journal import Journal')
s=s.replace('search=None,key_validator=None):','search=None,key_validator=None,journal=None,sync_key=None):',1).replace('  self.key_validator=','  self.journal=journal;self.sync_key=sync_key\n  self.key_validator=',1)
s=s.replace(' def reply(self,status,body):\n', ''' def reply(self,status,body):
  if getattr(self,'journal_key',None) and self.server.journal:
   try:body['history']=self.server.journal.record(self.journal_key,self.rid,self.path,status,body,None if getattr(self,'master_client',False) else getattr(self,'journal_body',None),round((time.monotonic()-self.request_started)*1000),self.request_started_wall)
   except Exception:body['history_warning']='History persistence failed; this response may not appear in synced history'
''',1)
s=s.replace('  self.rid=str(uuid.uuid4())',"  self.rid=str(uuid.uuid4());self.request_started=time.monotonic();self.request_started_wall=time.time();self.journal_key=None;self.journal_body=None;self.master_client=False",1)
s=s.replace("  if self.command=='GET' and self.path=='/v1/health'",'''  if self.command=='POST' and self.path=='/internal/history-sync':
   if not self.server.sync_key or self.headers.get('Host') not in {'127.0.0.1:'+str(self.server.server_port),'localhost:'+str(self.server.server_port)} or not hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+self.server.sync_key):return self.error(403,'forbidden','Private sync access only')
   if not self.server.journal:return self.error(503,'sync_unavailable','Journal unavailable')
   try:
    size=int(self.headers.get('Content-Length','0'))
    if self.headers.get('Transfer-Encoding') or not 0<size<=16000:raise ValueError()
    data=json.loads(self.rfile.read(size));accounts=[str(uuid.UUID(x)) for x in data['user_ids']]
    if not 1<=len(accounts)<=20:raise ValueError()
    if data['action']=='pull':return self.reply(200,{'events':self.server.journal.pull(accounts)})
    if data['action']=='ack' and len(data['event_ids'])<=30:
     self.server.journal.ack(accounts,[str(uuid.UUID(x)) for x in data['event_ids']]);return self.reply(200,{'ok':True})
   except (ValueError,KeyError,TypeError):return self.error(400,'invalid_sync','Invalid sync request')
   return self.error(400,'invalid_sync','Invalid sync action')
  if self.command=='GET' and self.path=='/v1/health' ''',1)
s=s.replace("  if self.command=='GET' and self.path=='/v1/models'", "  self.journal_key=raw_key;self.master_client=hmac.compare_digest(raw_key.encode(),self.server.key.encode())\n  if self.command=='GET' and self.path=='/v1/models'",1)
s=s.replace("'web_fallback','stream'}", "'web_fallback','stream','conversation_id','client_user_id'}",1)
s=s.replace("    model=body.get('model')", "    if 'conversation_id' in body and (not isinstance(body['conversation_id'],str) or not 1<=len(body['conversation_id'])<=120):raise ValueError()\n    if 'client_user_id' in body and (not isinstance(body['client_user_id'],str) or not 1<=len(body['client_user_id'])<=120):raise ValueError()\n    model=body.get('model')",1)
s=s.replace("   if plan['action']=='image':", "   self.journal_body=body\n   if plan['action']=='image':",1)
s=s.replace(" API(('127.0.0.1',8772),key,image_generate=", " journal=Journal(ROOT/'private/history-journal.sqlite3')\n sync_key=(ROOT/'private/history-sync-key').read_text().strip() if (ROOT/'private/history-sync-key').exists() else None\n API(('127.0.0.1',8772),key,journal=journal,sync_key=sync_key,image_generate=",1)
stage=P/'stage';stage.mkdir(exist_ok=True);(stage/'gateway_server.py').write_text(s);(P/'gateway-manifest.json').write_text(json.dumps({'target':str(target),'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(s.encode()).hexdigest()},indent=2));print('Staged gateway journal/private export; live gateway unchanged.')
