"""Explicit gateway installation only. Default is a read-only deployment plan."""
import argparse,hashlib,json,os,shutil,subprocess,time
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/home/cridergpt2026/cridergpt-chat-api');CODE=Path('/home/cridergpt2026/cridergpt-vision-assist/code')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 subprocess.run(['python3',str(P/'prepare_gateway.py')],check=True)
 manifest=json.loads((P/'manifest.json').read_text())
 print('Plan: install isolated helper code, back up and replace gateway server.py, restart ONLY user cridergpt-chat-api.service. No Engine restart, model retraining or key changes. Wait for image jobs to finish first.')
 if not args.apply:return
 if CODE.exists():raise SystemExit('Helper code already installed; refusing overwrite. Review an upgrade separately.')
 if digest(ROOT/'server.py')!=manifest['before'] or digest(P/'stage/server.py')!=manifest['after']:raise SystemExit('Live or staged source changed')
 if not Path('/home/cridergpt2026/cridergpt-vision-assist/model/model.safetensors').exists():raise SystemExit('Pinned local model must be downloaded and tested first')
 backup=ROOT/('server.before-vision-'+str(time.time_ns())+'.py');shutil.copy2(ROOT/'server.py',backup)
 # The isolated helper directory is already owned by the current unprivileged account.
 CODE.mkdir(mode=0o755)
 shutil.copy2(P/'bridge.py',CODE/'vision_bridge.py');shutil.copy2(P/'worker.py',CODE/'worker.py')
 try:
  staged=(P/'stage/server.py').read_text().replace('from vision_bridge import','import sys\nsys.path.insert(0,'+repr(str(CODE))+')\nfrom vision_bridge import',1)
  temporary=ROOT/'server.vision-install.py';temporary.write_text(staged);os.replace(temporary,ROOT/'server.py')
  subprocess.run(['systemctl','--user','restart','cridergpt-chat-api.service'],check=True)
  import urllib.request
  for attempt in range(20):
   try:
    with urllib.request.urlopen('http://127.0.0.1:8772/v1/health',timeout=2) as response:
     if response.status==200:break
   except Exception:time.sleep(.5)
  else:raise RuntimeError('Gateway health check failed')
 except Exception:
  shutil.copy2(backup,ROOT/'server.py');subprocess.run(['systemctl','--user','restart','cridergpt-chat-api.service'],check=False);raise
 print('Installed; verify an authenticated image request and text request. Backup:',backup)
if __name__=='__main__':main()
