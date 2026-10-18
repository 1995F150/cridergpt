"""Stage exact, reversible Local Chat changes; never install or restart here."""
import hashlib,json
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/opt/cridergpt-engine/native_chat_integration');stage=P/'stage';stage.mkdir(exist_ok=True)
manifest={}
for name,rel in [('engine_routes.py','engine_routes.py'),('store.py','store.py'),('platform.js','assets/platform.js')]:
 original=(ROOT/rel).read_text();text=original
 if name=='engine_routes.py':
  for function in ['send','measured_send']:
   marker=f'def {function}(body:Send,user=Depends(auth)):\n'
   if marker in text and marker+" if body.conversation_id.startswith('sync:')" not in text:text=text.replace(marker,marker+" if body.conversation_id.startswith('sync:'):raise HTTPException(409,'Synced history is read-only here; continue on the source platform')\n",1)
  if 'make_router as sync_router' not in text:text+='\n# Cloud history sync visibility uses the existing account authentication.\nfrom native_chat_integration.history_sync.local_routes import make_router as sync_router\nrouter.include_router(sync_router(auth,db))\n'
 elif name=='store.py':
  marker=' def append(self,user,id,role,text,model):\n'
  assert marker in text
  if "if id.startswith('sync:')" not in text:text=text.replace(marker,marker+"  if id.startswith('sync:'):raise ValueError('Synced website history is read-only here; continue it on the source platform')\n",1)
  text=text.replace('conversation_id=? ORDER BY id\'', 'conversation_id=? ORDER BY julianday(created_at),id\'')
 elif name=='platform.js':
  text=text.replace("activity:'API Activity'", "sync:'Synced History',activity:'API Activity'",1)
  text=text.replace("['Platform',['keys','activity','settings']]", "['Platform',['keys','sync','activity','settings']]")
  text=text.replace("['Platform',['activity','settings']]", "['Platform',['sync','activity','settings']]")
  message_marker="if(m.role==='assistant'){linkCitations"
  if "saved.sync_source" not in text:
   text=text.replace(message_marker,"if(saved.sync_source){body.append(el('small','Synced from '+saved.sync_source+' · read-only in Local Chat','disclaimer'));}if(saved.remote_image_url){try{const u=new URL(saved.remote_image_url);if(u.protocol==='https:'&&!u.username&&!u.password){const a=el('a','View source attachment');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}}catch{}}"+message_marker,1)
  marker=" if(key==='keys'){" if " if(key==='keys'){" in text else " if(['conversations','replay'].includes(key)){"
  branch=''' if(key==='sync'){
  const data=await api('sync/status');if(epoch!==pageEpoch)return;
  panel.append(el('p','Website and linked API conversations appear in the existing history, marked [Website] or [API]. Imported history is read-only here; continue on the source platform.'),table([data],[['Imported conversations','conversations'],['Imported memories','memories'],['Direction','direction'],['Automatic training','automatic_training']]),el('pre',JSON.stringify(data.status,null,2)),el('p','Synced memories are unverified records, not confirmed facts or approved training examples.'));
  const search=el('input');search.placeholder='Search synced memories';search.setAttribute('aria-label','Search synced memories');const output=el('div');let offset=0;
  const load=async(append=false)=>{const d=await api('sync/memories?'+new URLSearchParams({q:search.value,offset:String(offset)}));if(epoch!==pageEpoch)return;if(!append)output.replaceChildren();output.querySelector('[data-more]')?.remove();for(const memory of d.items){const card=el('article',memory.content,'replay-card');card.append(action('Save a reviewed fact to my memory',async()=>{const text=prompt('Enter the fact you personally verified (maximum 400 characters). This does not approve training.',memory.content.length<=400?memory.content:'');if(text===null)return;if(!text.trim()||text.length>400)throw Error('Enter 1–400 characters.');await api('memories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text})});notice('Saved to your account memory. No training started.');}));output.append(card);}offset=d.next_offset;if(offset!==null){const more=action('More memories',()=>load(true));more.dataset.more='true';output.append(more);}};
  panel.append(search,action('Search memories',()=>{offset=0;return load();}),output);await load();
  const account=await api('account');if(account.is_owner)panel.append(action('Review training candidates',async()=>{const r=await api('sync/training-review');output.replaceChildren(el('p','Nothing here is approved for training. Check factual accuracy and privacy before any export.'),el('pre',JSON.stringify(r,null,2)));}));
 }else '''
  assert marker in text
  if "if(key==='sync')" not in text:text=text.replace(marker,branch+marker.lstrip(),1)
 (stage/name).write_text(text);manifest[name]={'target':str(ROOT/rel),'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(text.encode()).hexdigest()}
(P/'local-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Staged local UI/router/store changes; nothing installed.')
