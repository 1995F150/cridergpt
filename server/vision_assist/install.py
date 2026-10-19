"""Install private bounded helper and same-URL gateway patch. Read-only plan by default."""
import argparse,hashlib,json,os,shutil,subprocess,time,urllib.request
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/home/cridergpt2026/cridergpt-chat-api');CODE=Path('/home/cridergpt2026/cridergpt-vision-assist/code')
UNITS=Path.home()/'.config/systemd/user';UNIT=UNITS/'cridergpt-vision-assist.service';DROP=UNITS/'cridergpt-chat-api.service.d/vision-assist.conf'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def systemctl(*args):subprocess.run(['systemctl','--user',*args],check=True)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 subprocess.run(['python3',str(P/'prepare_gateway.py')],check=True);manifest=json.loads((P/'manifest.json').read_text())
 print('Plan: back up and install private Unix-socket vision helper (2300M RAM, 150% CPU, no network/GPU access), add only its user service and gateway dependency, patch/restart the existing API. Gateway stays at 128M; keys/URLs/weights unchanged.')
 if not args.apply:return
 key=(ROOT/'private/api-key').read_text().strip();request=urllib.request.Request('http://127.0.0.1:8773/health',headers={'Authorization':'Bearer '+key})
 try:
  with urllib.request.urlopen(request,timeout=3) as response:health=json.load(response)
  if health.get('busy'):raise SystemExit('Image generation is busy; retry after it completes.')
 except SystemExit:raise
 except Exception:raise SystemExit('Could not verify image-worker idleness; no deployment performed.')
 if digest(ROOT/'server.py')!=manifest['before'] or digest(P/'stage/server.py')!=manifest['after']:raise SystemExit('Source drift; stop and review.')
 if not Path('/home/cridergpt2026/cridergpt-vision-assist/model/model.safetensors').exists():raise SystemExit('Pinned helper weights are unavailable.')
 was_active=subprocess.run(['systemctl','--user','is-active','--quiet',UNIT.name]).returncode==0
 was_enabled=subprocess.run(['systemctl','--user','is-enabled','--quiet',UNIT.name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
 backup=P/'deployment-backups'/str(time.time_ns());backup.mkdir(parents=True,mode=0o700)
 targets=[(CODE/'vision_bridge.py',P/'bridge.py'),(CODE/'worker.py',P/'worker.py'),(CODE/'service.py',P/'service.py'),(UNIT,P/'cridergpt-vision-assist.service')]
 targets_backup=[ROOT/'server.py',DROP,*[target for target,source in targets]]
 original={}
 for index,target in enumerate(targets_backup):
  if target.is_symlink():raise SystemExit('Refusing symlink target: '+str(target))
  original[str(target)]=None
  if target.exists():
   name=str(index)+'-'+target.name;shutil.copy2(target,backup/name);original[str(target)]=name
 (backup/'manifest.json').write_text(json.dumps(original,indent=2))
 (backup/'unit-state.json').write_text(json.dumps({'active':was_active,'enabled':was_enabled}))
 try:
  CODE.mkdir(exist_ok=True,mode=0o755)
  for target,source in targets:target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  DROP.parent.mkdir(parents=True,exist_ok=True);DROP.write_text('[Unit]\nWants=cridergpt-vision-assist.service\nAfter=cridergpt-vision-assist.service\n')
  systemctl('daemon-reload');systemctl('enable',UNIT.name);systemctl('restart',UNIT.name)
  for attempt in range(20):
   import sys
   if str(CODE) not in sys.path:sys.path.insert(0,str(CODE))
   import vision_bridge
   try:
    c=vision_bridge.VisionConnection('localhost',timeout=2);c.request('GET','/health');r=c.getresponse();r.read();c.close()
    if r.status==200:break
   except Exception:time.sleep(.5)
  else:raise RuntimeError('Private vision helper did not become healthy')
  staged=(P/'stage/server.py').read_text()
  compile(staged,'server.py','exec');temporary=ROOT/'server.vision-install.py';temporary.write_text(staged);os.replace(temporary,ROOT/'server.py')
  systemctl('restart','cridergpt-chat-api.service')
  for attempt in range(20):
   try:
    with urllib.request.urlopen('http://127.0.0.1:8772/v1/health',timeout=2) as response:
     if response.status==200:break
   except Exception:time.sleep(.5)
  else:raise RuntimeError('Gateway health check failed')
 except Exception:
  subprocess.run(['systemctl','--user','disable','--now',UNIT.name],check=False)
  for target,name in original.items():
   target=Path(target)
   if name:shutil.copy2(backup/name,target)
   elif target.exists():target.unlink()
  systemctl('daemon-reload')
  if was_enabled:systemctl('enable',UNIT.name)
  if was_active:systemctl('restart',UNIT.name)
  systemctl('restart','cridergpt-chat-api.service');raise
 print('Installed. Private helper and gateway healthy. Backup:',backup)
if __name__=='__main__':main()
