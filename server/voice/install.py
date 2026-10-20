"""Install ONLY the private voice user service. Never changes existing services/routes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

P=Path(__file__).resolve().parent
ROOT=Path.home()/'cridergpt-voice'

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 unit=Path.home()/'.config/systemd/user/cridergpt-voice.service'
 print('Plan: copy isolated voice code, create private state/key, enable/start ONLY cridergpt-voice.service; Unix socket only, CPUQuota=100%, MemoryMax=3G, no swap, no GPU/network. No existing service, firewall, DNS, proxy, gateway, public URL or database is modified.')
 if not args.apply:return
 if unit.exists():raise SystemExit('Voice unit already exists; inspect it and perform a versioned upgrade rather than overwriting it.')
 if not (ROOT/'venv/bin/python').exists() or not (ROOT/'models/manifest.json').exists():raise SystemExit('Prepare isolated runtime and pinned models first.')
 revision=subprocess.check_output(['git','-C',str(ROOT/'openvoice-source'),'rev-parse','HEAD']).decode().strip()
 if revision!='74a1d147b17a8c3092dd5430504bd83ef6c7eb23':raise SystemExit('OpenVoice source revision differs')
 model_manifest=json.loads((ROOT/'models/manifest.json').read_text())
 for name,entry in model_manifest['models'].items():
  for filename,metadata in entry['files'].items():
   with (ROOT/'models'/name/filename).open('rb') as stream:
    if hashlib.file_digest(stream,'sha256').hexdigest()!=metadata['sha256']:raise SystemExit('Model checksum mismatch')
 code=ROOT/'code';state=ROOT/'state'
 if code.exists():raise SystemExit('Voice code already exists; no overwrite')
 code.mkdir(mode=0o700);state.mkdir(mode=0o700,exist_ok=True);(state/'cache').mkdir(mode=0o700,exist_ok=True)
 for name in ['service.py','worker.py','auth.py','enrollment.py','web.html']:shutil.copy2(P/name,code/name)
 import sys
 sys.path.insert(0,str(P))
 from auth import AuthStore,SCOPES
 auth=AuthStore(state)
 key=state/'operator.key'
 if key.exists():raise SystemExit('Existing operator key; stop rather than replace it')
 token=auth.issue('local-operator','Private voice operator',SCOPES)
 fd=os.open(key,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as stream:stream.write(token+'\n')
 auth.close()
 manifest={'source_revision':revision,'code_sha256':{name:hashlib.sha256((code/name).read_bytes()).hexdigest() for name in ['service.py','worker.py','auth.py','enrollment.py','web.html']},'root':str(ROOT),'public_chat_connected':False,'operator_key_expires_days':90}
 (ROOT/'installation.json').write_text(json.dumps(manifest,indent=2)+'\n')
 unit.parent.mkdir(parents=True,exist_ok=True)
 contents=(P/'cridergpt-voice.service').read_text().replace('/home/cridergpt2026/cridergpt-voice',str(ROOT))
 unit.write_text(contents)
 try:
  subprocess.run(['systemctl','--user','daemon-reload'],check=True)
  subprocess.run(['systemctl','--user','enable','--now',unit.name],check=True)
  import httpx
  socket=Path(os.environ.get('XDG_RUNTIME_DIR',f'/run/user/{os.getuid()}'))/'cridergpt-voice/api.sock'
  for _ in range(45):
   try:
    with httpx.Client(transport=httpx.HTTPTransport(uds=str(socket)),base_url='http://voice',timeout=2) as client:
     response=client.get('/health')
     if response.status_code==200 and response.json().get('ready'):
      print('Private voice service healthy. Operator key is in:',key);return
   except (OSError,httpx.HTTPError):pass
   time.sleep(1)
  raise RuntimeError('New voice service failed health verification')
 except BaseException:
  subprocess.run(['systemctl','--user','disable','--now',unit.name],check=False)
  # Preserve state, models, code and diagnostics for review. Existing services untouched.
  raise
if __name__=='__main__':main()
