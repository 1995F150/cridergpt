"""Stage Local Chat upload/route changes; protected Engine files remain untouched."""
from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parent;ROOT=Path('/opt/cridergpt-engine/native_chat_integration');stage=P/'stage';stage.mkdir(exist_ok=True)
manifest={}
for name in ['engine_routes.py','chat.html']:
 original=(ROOT/name).read_text();text=original
 if name=='engine_routes.py':
  text=text.replace('class Send(BaseModel):','class Send(BaseModel):\n image_base64:str|None=Field(default=None,max_length=4194404)',1)
  marker='   result=native(body.model,messages,account_context)'
  assert marker in text
  text=text.replace(marker,"   import sys\n   sys.path.insert(0,'/home/cridergpt2026/cridergpt-vision-assist/code')\n   from vision_bridge import with_vision\n   result=with_vision(body.model,messages,body.image_base64,lambda chosen,turns:native(chosen,turns,account_context))",1)
  marker="  if body.web_fallback not in"
  text=text.replace(marker,"  if body.image_base64 and (body.model.startswith(('openai:','ollama:')) or len(body.message)>500):raise HTTPException(422,'Local vision assistance requires a native text checkpoint and an image question of at most 500 characters')\n"+marker,1)
  text=text.replace("  if plan['action']=='web' and body.model", "  if body.image_base64:plan={'action':'text','reason':'explicit_image_analysis','automatic':False}\n  if plan['action']=='web' and body.model",1)
  text=text.replace("SAFE_METRICS={'finish_reason'", "SAFE_METRICS={'vision_assisted','vision_helper','vision_revision','vision_latency_ms','finish_reason'",1)
 else:
  marker="byId('composer').onsubmit=async e=>"
  assert marker in text
  text=text.replace(marker,"let attachedImage=null,imageLoading=false;const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.setAttribute('aria-label','Attach image for experimental local vision assistance');byId('message').before(upload);upload.onchange=async()=>{if(busy){upload.value='';return;}const f=upload.files[0];if(!f){attachedImage=null;return;}if(f.size>3*1024*1024){notice('Use an image smaller than 3 MiB');upload.value='';attachedImage=null;return;}imageLoading=true;const reader=new FileReader();reader.onload=()=>{attachedImage=String(reader.result);imageLoading=false;};reader.onerror=()=>{imageLoading=false;notice('Image could not be read');};reader.readAsDataURL(f);};\n"+marker,1)
  text=text.replace("e.preventDefault();if(busy","e.preventDefault();if(imageLoading){notice('Wait for the image to finish loading');return;}if(busy",1)
  text=text.replace("pendingRequest.message!==message","pendingRequest.image!==attachedImage||pendingRequest.message!==message",1)
  text=text.replace("id:requestUUID(),message,model,conversation,","id:requestUUID(),image:attachedImage,message,model,conversation,",1)
  text=text.replace("write('send',{message,model,conversation_id:","write('send',{message,model,...(attachedImage?{image_base64:attachedImage}:{}),conversation_id:",1)
  text=text.replace("pendingRequest=null;byId('message').value='';", "pendingRequest=null;attachedImage=null;upload.value='';byId('message').value='';",1)
 (stage/('local-'+name)).write_text(text)
 manifest[name]={'target':str(ROOT/name),'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(text.encode()).hexdigest()}
(P/'local-manifest.json').write_text(json.dumps(manifest,indent=2))
print('Local Chat upload/vision route staged; nothing installed.')
