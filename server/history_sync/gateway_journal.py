"""Private per-integration API history spool; never trusts a client-supplied owner ID."""
import hashlib,json,sqlite3,uuid
from pathlib import Path
from datetime import datetime,timezone

def now():return datetime.now(timezone.utc).isoformat()
class Journal:
 def __init__(self,path):
  self.path=Path(path);self.path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  with sqlite3.connect(self.path) as c:c.execute('CREATE TABLE IF NOT EXISTS events(revision INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL,entity TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,delivered INTEGER NOT NULL DEFAULT 0)')
  self.path.chmod(0o600)
 def record(self,raw_key,request_id,path,status,response,request_body=None,latency_ms=None,started_at=None):
  b=request_body or {};client=str(b.get('client_user_id','integration'))[:120]
  account=str(uuid.uuid5(uuid.NAMESPACE_URL,'cridergpt-api:'+hashlib.sha256(raw_key.encode()).hexdigest()+':'+client))
  conversation=str(uuid.uuid5(uuid.UUID(account),str(b.get('conversation_id') or request_id)))
  timestamp=now();start=datetime.fromtimestamp(started_at,timezone.utc).isoformat() if isinstance(started_at,(int,float)) else timestamp; base={'created_at':timestamp,'conversation_id':conversation}
  records=[('request',request_id,{**base,'created_at':start,'model':response.get('model') or b.get('model'),'status':'success' if status<400 else 'failure','error_category':response.get('error',{}).get('code'),'latency_ms':latency_ms,'path':path})]
  if request_body and path=='/v1/chat':
   messages=b.get('messages') or [{'role':'user','content':b.get('message','')}]
   user=next((m.get('content') for m in reversed(messages) if m.get('role')=='user'),None)
   if isinstance(user,str):
    records.append(('conversation',conversation,{**base,'created_at':start,'id':conversation,'title':user[:100]}))
    records.append(('message',str(uuid.uuid5(uuid.UUID(request_id),'user')),{**base,'created_at':start,'role':'user','content':user,'metadata':{'request_id':request_id}}))
   if 200<=status<300 and isinstance(response.get('response'),str):records.append(('message',str(uuid.uuid5(uuid.UUID(request_id),'assistant')),{**base,'role':'assistant','content':response['response'],'metadata':{k:response[k] for k in ['model','request_id','finish_reason','incomplete','source','latency_ms','generated_tokens'] if k in response}}))
  with sqlite3.connect(self.path) as c:
   for kind,id,payload in records:
    if kind=='conversation' and c.execute("SELECT 1 FROM events WHERE user_id=? AND entity='conversation' AND entity_id=?",(account,id)).fetchone():continue
    c.execute('INSERT OR IGNORE INTO events(event_id,user_id,entity,entity_id,payload,created_at) VALUES(?,?,?,?,?,?)',(str(uuid.uuid5(uuid.UUID(request_id),kind+':'+id)),account,kind,id,json.dumps(payload),timestamp))
  return {'source_account':account,'conversation_id':conversation}
 def pull(self,accounts):
  if not accounts:return []
  with sqlite3.connect(self.path) as c:
   c.row_factory=sqlite3.Row;rows=c.execute('SELECT * FROM events WHERE delivered=0 AND user_id IN ('+','.join('?' for _ in accounts)+') ORDER BY revision LIMIT 30',accounts).fetchall()
  return [{**{k:r[k] for k in ['revision','event_id','user_id','entity','entity_id','created_at']},'operation':'upsert','origin':'api','payload':json.loads(r['payload'])} for r in rows]
 def ack(self,accounts,events):
  with sqlite3.connect(self.path) as c:
   for event in events:
    for account in accounts:c.execute('UPDATE events SET delivered=1,payload=? WHERE event_id=? AND user_id=?',('{}',event,account))
