"""Stage existing deployment files. Never write to live paths or restart services."""
import hashlib
import json
from pathlib import Path
P=Path(__file__).resolve().parent
STAGE=P/'stage';STAGE.mkdir(exist_ok=True)
manifest=[]
def save(source, original, updated, name):
    if original == updated: raise RuntimeError(f'No patch applied: {name}')
    compile(updated,name,'exec')
    (STAGE/name).write_text(updated)
    manifest.append(dict(target=str(source), staged=name,before=hashlib.sha256(original.encode()).hexdigest(),after=hashlib.sha256(updated.encode()).hexdigest()))

source=Path('/opt/cridergpt-engine/native_chat_integration/engine_routes.py')
original=source.read_text();s=original
s=s.replace('send_lock=threading.Lock()', '''def request_fingerprint(body):
 # Bind retry IDs to every validated request field (including model and routing).
 payload=body.model_dump(exclude={'client_request_id'})
 return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
send_lock=threading.Lock()''',1)
old="     if meta.get('client_request_id')==body.client_request_id:return {**meta,'response':saved['content'],'model':saved['model'],'message_id':saved['id'],'deduplicated':True}"
new="""     if meta.get('client_request_id')==body.client_request_id:
      if meta.get('request_fingerprint')!=request_fingerprint(body):raise HTTPException(409,'Retry ID belongs to a different or legacy request; use a new request ID')
      return {**meta,'response':saved['content'],'model':saved['model'],'message_id':saved['id'],'deduplicated':True}"""
assert old in s;s=s.replace(old,new,1)
s=s.replace("{'client_request_id':body.client_request_id", "{'request_fingerprint':request_fingerprint(body),'client_request_id':body.client_request_id")
s=s.replace("  if body.client_request_id:metadata['client_request_id']=body.client_request_id", "  if body.client_request_id:metadata.update(client_request_id=body.client_request_id,request_fingerprint=request_fingerprint(body))",1)
s=s.replace("'provider_request_id'}", "'provider_request_id','prompt_sha256','response_sha256','adapter_request_id','input_ids_sha256'}",1)
s=s.replace("  result=send(body,user)\n", "  result=send(body,user)\n  result['prompt_sha256']=request_fingerprint(body)\n  result['response_sha256']=hashlib.sha256(result['response'].encode()).hexdigest()\n",1)
s=s.replace("'metadata':{k:v for k,v in (result or {}).items()", "'metadata':{'request_id':request_id,**{k:v for k,v in (result or {}).items()",1)
s=s.replace("if k in SAFE_METRICS and isinstance(v,(str,int,float,bool,type(None)))}})\n", "if k in SAFE_METRICS and isinstance(v,(str,int,float,bool,type(None)))}}})\n",1)
save(source,original,s,'engine_routes.py')

source=Path('/home/cridergpt2026/cridergpt-engine-verified/native-chat-integration/worker.py')
original=source.read_text();s=original.replace('import hmac,json,','import hashlib,hmac,json,',1)
s=s.replace("  result['request_id']=request_id", """  result['request_id']=request_id
  result['prompt_sha256']=hashlib.sha256(json.dumps(body.get('messages',[]),sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
  if isinstance(result.get('response'),str):result['response_sha256']=hashlib.sha256(result['response'].encode()).hexdigest()""",1)
s=s.replace("'model':result.get('model'),", "'model':result.get('model',body.get('model')),'checkpoint':result.get('checkpoint'),'adapter_request_id':result.get('adapter_request_id'),'prompt_sha256':result['prompt_sha256'],'response_sha256':result.get('response_sha256'),",1)
save(source,original,s,'worker.py')

source=Path('/home/cridergpt2026/cridergpt-chat-api/server.py')
original=source.read_text();s=original.replace('import os,hmac,','import hashlib,os,hmac,',1)
s=s.replace('  data=json.dumps(body).encode();self.send_response(status)', '''  if self.path=='/v1/chat':
   logging.getLogger('cridergpt.request_audit').info(json.dumps({'event':'api_chat','request_id':self.rid,'inference_request_id':body.get('inference_request_id'),'model':body.get('model',getattr(self,'requested_model',None)),'checkpoint_sha256':getattr(self,'checkpoint_sha256',None),'prompt_sha256':getattr(self,'prompt_sha256',None),'response_sha256':hashlib.sha256(body['response'].encode()).hexdigest() if isinstance(body.get('response'),str) else None,'status':status}))
  data=json.dumps(body).encode();self.send_response(status)''',1)
s=s.replace("   if plan['action']=='image':", """   self.requested_model=model
   self.checkpoint_sha256=models()[model]['sha256']
   self.prompt_sha256=hashlib.sha256(json.dumps(messages,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
   if plan['action']=='image':""",1)
s=s.replace("REGISTRY=ROOT/'model-catalog.json'", "REGISTRY=ROOT/'model-catalog.json'\nlogging.getLogger('cridergpt.request_audit').setLevel(logging.INFO)",1)
save(source,original,s,'server.py')
(P/'edges-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Three boundary patches staged; no live files changed.')
