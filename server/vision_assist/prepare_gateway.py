"""Produce a reversible gateway patch; never install/restart production."""
from pathlib import Path
import hashlib,json
root=Path('/home/cridergpt2026/cridergpt-chat-api');p=Path(__file__).resolve().parent
original=(root/'server.py').read_text();text=original
text=text.replace('from image_jobs import','from vision_bridge import with_vision, available as vision_available\nfrom image_jobs import',1)
text=text.replace("0<size<=32768","0<size<=4_230_000",1).replace('Request must be 1–32768 bytes','Request exceeds bounded image/text request size',1)
text=text.replace("'web_fallback','stream'}","'web_fallback','stream','image_base64'}",1)
marker="    plan=decide(messages[-1]['content'],"
assert marker in text
pos=text.index(marker);text=text[:pos]+"    if body.get('image_base64') is not None and (not isinstance(body['image_base64'],str) or not 0<len(body['image_base64'])<=4_194_404 or len(messages[-1]['content'])>500):raise ValueError()\n"+text[pos:]
text=text.replace("    if 'search_query' in body", "    if body.get('image_base64') is not None:plan={'action':'text','reason':'explicit_image_analysis','automatic':False}\n    if 'search_query' in body",1)
text=text.replace('try:result=self.server.generate(model,messages)','try:result=with_vision(model,messages,body.get(\'image_base64\'),self.server.generate)',1)
text=text.replace("diagnostics={k:result.get(k) for k in [", "diagnostics={k:result.get(k) for k in ['vision_assisted','vision_helper','vision_revision','vision_latency_ms',",1)
text=text.replace("'experimental':True} for e", "'experimental':True,'vision_assist_supported':vision_available()} for e",1)
stage=p/'stage';stage.mkdir(exist_ok=True);(stage/'server.py').write_text(text)
(p/'manifest.json').write_text(json.dumps({'target':str(root/'server.py'),'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(text.encode()).hexdigest()},indent=2))
print('Gateway vision patch staged; not installed.')
