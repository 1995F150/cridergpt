"""Authenticated visibility for imported cloud memories and content-free status."""
import json
from fastapi import APIRouter,Depends,Query,HTTPException
from .replica import Replica
from .review import candidates

def make_router(auth,db):
 router=APIRouter()
 @router.get('/local-chat/sync/status')
 def status(user=Depends(auth)):
  replica=Replica(db().path)
  with replica.connection() as c:
   count=c.execute("SELECT COUNT(*) FROM native_conversations WHERE user_id=? AND id LIKE 'sync:%' AND deleted=0",(user,)).fetchone()[0]
   memories=c.execute('SELECT COUNT(*) FROM external_sync_memories WHERE user_id=?',(user,)).fetchone()[0]
  return {'status':replica.status() if user=='owner' else {},'conversations':count,'memories':memories,'direction':'external_to_local','automatic_training':False,'verified_memories':False}
 @router.get('/local-chat/sync/memories')
 def memories(q:str='',offset:int=Query(0,ge=0),limit:int=Query(30,ge=1,le=50),user=Depends(auth)):
  replica=Replica(db().path)
  with replica.connection() as c:rows=[dict(r) for r in c.execute('SELECT remote_id,content,metadata_json FROM external_sync_memories WHERE user_id=? AND instr(lower(content),lower(?))>0 ORDER BY remote_id LIMIT ? OFFSET ?',(user,q[:200],limit+1,offset))]
  return {'items':[{'id':r['remote_id'],'content':r['content'][:4000],'metadata':json.loads(r['metadata_json'])} for r in rows[:limit]],'next_offset':offset+limit if len(rows)>limit else None}
 @router.get('/local-chat/sync/training-review')
 def training_review(user=Depends(auth)):
  if user!='owner':raise HTTPException(403,'Owner access required')
  return {'items':candidates(db(),user),'automatic_training':False,'approved':False}
 return router
