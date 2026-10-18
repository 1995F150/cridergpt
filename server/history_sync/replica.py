"""Additive Supabase replica in the existing Local Chat SQLite DB.

No account guessing, model loading, training, or application credential handling.
Source IDs/revisions and local writes commit in one transaction; ack only afterward.
"""
import json,sqlite3,uuid
from contextlib import contextmanager
from datetime import datetime,timezone
from pathlib import Path
SAFE={'model','requested_model','source','provider','request_id','inference_request_id','finish_reason','incomplete','answer_origin','generated_tokens','tokens_used','input_tokens','latency_ms','experimental'}
def uid(value):return str(uuid.UUID(str(value)))
def now():return datetime.now(timezone.utc).isoformat()
class Replica:
 def __init__(self,path):
  self.path=Path(path)
  # Core application tables must exist; never initialize or replace its database.
  with self.connection() as c:
   required={'local_chat_messages','native_conversations','local_chat_users'}
   existing={r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
   if not required<=existing:raise ValueError('Initialize a Local Chat database before installing sync')
   c.executescript('''CREATE TABLE IF NOT EXISTS external_sync_records(source_account TEXT NOT NULL,entity TEXT NOT NULL,remote_id TEXT NOT NULL,revision INTEGER NOT NULL,deleted INTEGER NOT NULL,local_message_id INTEGER,PRIMARY KEY(source_account,entity,remote_id));
   CREATE TABLE IF NOT EXISTS external_sync_receipts(event_id TEXT PRIMARY KEY,received_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS external_sync_memories(source_account TEXT NOT NULL,remote_id TEXT NOT NULL,user_id TEXT NOT NULL,content TEXT NOT NULL,metadata_json TEXT NOT NULL,PRIMARY KEY(source_account,remote_id));
   CREATE TABLE IF NOT EXISTS external_sync_state(key TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE INDEX IF NOT EXISTS external_sync_memory_owner ON external_sync_memories(user_id);
   ''')
 @contextmanager
 def connection(self):
  c=sqlite3.connect(self.path,timeout=5);c.row_factory=sqlite3.Row
  try:
   with c:yield c
  finally:c.close()
 def apply(self,events,links):
  if not isinstance(events,list) or len(events)>30:raise ValueError('Batch must contain at most 30 events')
  accepted=[]
  with self.connection() as c:
   for event in events:
    account=uid(event['user_id']);local=links.get(account)
    if local is None:continue
    if local!='owner' and not c.execute('SELECT 1 FROM local_accounts WHERE id=?',(local,)).fetchone():raise ValueError('Linked local account does not exist')
    kind=event['entity'];operation=event['operation'];remote=uid(event['entity_id']);revision=event['revision'];eid=event['event_id'];p=event['payload']
    if kind not in {'conversation','message','memory','request'} or operation not in {'upsert','delete'} or type(revision)!=int or revision<0 or not isinstance(eid,str) or not 1<=len(eid)<=200 or not isinstance(p,dict):raise ValueError('Malformed event')
    old=c.execute('SELECT * FROM external_sync_records WHERE source_account=? AND entity=? AND remote_id=?',(account,kind,remote)).fetchone()
    if c.execute('SELECT 1 FROM external_sync_receipts WHERE event_id=?',(eid,)).fetchone() or (old and old['revision']>=revision):accepted.append(eid);continue
    origin=event.get('origin','supabase')
    if origin not in {'supabase','api'}:raise ValueError('Invalid source')
    deleted=int(operation=='delete')
    conversation='sync:'+account+':'+(remote if kind=='conversation' else uid(p['conversation_id']) if kind=='message' and operation=='upsert' else '')
    message_id=old['local_message_id'] if old else None
    if kind=='conversation':
     if deleted:c.execute('UPDATE native_conversations SET deleted=1 WHERE user_id=? AND id=?',(local,conversation))
     else:
      title=p.get('title','Website conversation')
      if not isinstance(title,str):raise ValueError('Invalid title')
      c.execute("INSERT INTO native_conversations(id,user_id,title,deleted) VALUES(?,?,?,0) ON CONFLICT(user_id,id) DO UPDATE SET title=excluded.title",(conversation,local,('[API] ' if origin=='api' else '[Website] ')+title[:110]))
    elif kind=='message':
     if deleted:
      if message_id:c.execute('DELETE FROM local_chat_messages WHERE id=? AND user_id=?',(message_id,local))
      c.execute('DELETE FROM local_request_events WHERE id=? AND user_id=?',('sync-msg:'+account+':'+remote,local))
     else:
      if p.get('role') not in {'user','assistant'} or not isinstance(p.get('content'),str) or len(p['content'])>200000:raise ValueError('Invalid message')
      parent=uid(p['conversation_id']);tombstone=c.execute("SELECT deleted FROM external_sync_records WHERE source_account=? AND entity='conversation' AND remote_id=?",(account,parent)).fetchone()
      if not tombstone or not tombstone['deleted']:
       c.execute("INSERT OR IGNORE INTO native_conversations(id,user_id,title) VALUES(?,?,'[Website] Conversation')",(conversation,local))
       c.execute("INSERT OR IGNORE INTO local_chat_users VALUES(?,?,'{}',datetime('now'),datetime('now'))",(local,local))
       metadata=p.get('metadata') if isinstance(p.get('metadata'),dict) else {}
       metadata={k:v for k,v in metadata.items() if k in SAFE and (v is None or type(v) in {str,int,float,bool})}
       metadata.update(sync_source=origin,source_message_id=remote,source_account=account,training_approved=False)
       if isinstance(p.get('image_url'),str):metadata['remote_image_url']=p['image_url'][:4000]
       model=metadata.get('model');model=model[:160] if isinstance(model,str) else None
       timestamp=p.get('created_at') or event.get('created_at') or now()
       if not p.get('created_at'):metadata['original_timestamp_missing']=True;metadata['timestamp_semantics']='sync_observed_at'
       datetime.fromisoformat(timestamp.replace('Z','+00:00'))
       values=(p['role'],p['content'],timestamp,model,json.dumps(metadata),local,conversation)
       if message_id:c.execute('UPDATE local_chat_messages SET role=?,content=?,created_at=?,model=?,metadata_json=?,conversation_id=? WHERE user_id=? AND id=?',values[:5]+(conversation,local,message_id))
       else:message_id=c.execute('INSERT INTO local_chat_messages(role,content,created_at,model,metadata_json,user_id,conversation_id) VALUES(?,?,?,?,?,?,?)',values).lastrowid
       if model:c.execute('UPDATE native_conversations SET model=? WHERE user_id=? AND id=?',(model,local,conversation))
       if origin=='supabase' and p['role']=='assistant':
        status='incomplete' if metadata.get('incomplete') else 'success'
        c.execute('INSERT OR REPLACE INTO local_request_events(id,user_id,conversation_id,model,provider,status,error_category,started_at,latency_ms,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?)',('sync-msg:'+account+':'+remote,local,conversation,model,'supabase',status,None,timestamp,metadata.get('latency_ms'),json.dumps({'sync_source':'supabase','source_request_id':metadata.get('request_id'),'timestamp_semantics':'reply_recorded_at','generated_tokens':metadata.get('generated_tokens')})))
    elif kind=='request':
     status=p.get('status')
     if status not in {'success','failure','incomplete'}:raise ValueError('Invalid request status')
     c.execute('INSERT OR IGNORE INTO local_request_events(id,user_id,conversation_id,model,provider,status,error_category,started_at,latency_ms,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?)',('sync:'+account+':'+remote,local,'sync:'+account+':'+uid(p['conversation_id']) if p.get('conversation_id') else None,p.get('model'),'api',status,p.get('error_category'),p.get('created_at') or now(),p.get('latency_ms'),json.dumps({'sync_source':origin,'source_request_id':remote})))
    elif kind=='memory':
     if deleted:c.execute('DELETE FROM external_sync_memories WHERE source_account=? AND remote_id=?',(account,remote))
     else:
      content=p.get('content') or p.get('details') or ''
      if not isinstance(content,str) or len(content)>100000:raise ValueError('Invalid memory')
      meta={'sync_source':'supabase','category':str(p.get('category') or '')[:120],'topic':str(p.get('topic') or '')[:160],'verified':False,'training_approved':False}
      c.execute('INSERT INTO external_sync_memories VALUES(?,?,?,?,?) ON CONFLICT(source_account,remote_id) DO UPDATE SET content=excluded.content,metadata_json=excluded.metadata_json',(account,remote,local,content,json.dumps(meta)))
    c.execute('INSERT INTO external_sync_records VALUES(?,?,?,?,?,?) ON CONFLICT(source_account,entity,remote_id) DO UPDATE SET revision=excluded.revision,deleted=excluded.deleted,local_message_id=excluded.local_message_id',(account,kind,remote,revision,deleted,message_id))
    c.execute('INSERT OR IGNORE INTO external_sync_receipts VALUES(?,?)',(eid,now()));accepted.append(eid)
   c.execute("INSERT INTO external_sync_state VALUES('last_local_commit',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(now(),))
  return accepted
 def status(self):
  with self.connection() as c:return {r['key']:r['value'] for r in c.execute('SELECT key,value FROM external_sync_state')}
 def mark(self,key,value):
  with self.connection() as c:c.execute('INSERT INTO external_sync_state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',(key,value))
