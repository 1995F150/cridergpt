"""Explicit, backed-up deployment of the gateway journal; never automatic."""
import argparse,hashlib,json,os,pwd,shutil,subprocess,time,urllib.request
from pathlib import Path
P=Path(__file__).resolve().parent
ROOT=Path('/home/cridergpt2026/cridergpt-chat-api')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def put(source,target,owner):
 temporary=target.with_name(target.name+'.history-install');shutil.copyfile(source,temporary);os.chown(temporary,owner.st_uid,owner.st_gid);os.chmod(temporary,0o644);os.replace(temporary,target)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--key-source',default='/etc/cridergpt-history-sync.key');a=parser.parse_args()
 subprocess.run(['python3',str(P/'prepare_gateway_patch.py')],check=True)
 manifest=json.loads((P/'gateway-manifest.json').read_text());target=Path(manifest['target']);owner=target.stat();account=pwd.getpwuid(owner.st_uid)
 print('Plan: enable authenticated API journaling and private loopback export. Existing client keys unchanged. Restart only the public API gateway; wait for image jobs to finish before applying.')
 if not a.apply:return
 if os.geteuid()!=0:raise SystemExit('sudo required to read the private sync key and preserve deployment ownership. No changes applied.')
 if sha(target)!=manifest['before']:raise SystemExit('Live gateway changed; rebuild required')
 keytarget=ROOT/'private/history-sync-key'
 if keytarget.exists() or (ROOT/'gateway_journal.py').exists():raise SystemExit('Existing journal installation found; do not overwrite it')
 key=Path(a.key_source).read_text().strip()
 if len(key)<40:raise SystemExit('Missing dedicated sync key')
 backup=ROOT/'backups'/('history-sync-'+str(time.time_ns()));backup.mkdir(mode=0o700,parents=True);shutil.copy2(target,backup/'server.py')
 def restart():
  subprocess.run(['runuser','-u',account.pw_name,'--','env','XDG_RUNTIME_DIR=/run/user/'+str(owner.st_uid),'systemctl','--user','restart','cridergpt-chat-api.service'],check=True)
 try:
  with keytarget.open('x') as f:os.fchmod(f.fileno(),0o600);f.write(key+'\n')
  os.chown(keytarget,owner.st_uid,owner.st_gid)
  put(P/'gateway_journal.py',ROOT/'gateway_journal.py',owner);put(P/'stage/gateway_server.py',target,owner);restart()
  ready=False
  for _ in range(15):
   try:
    with urllib.request.urlopen('http://127.0.0.1:8772/v1/health',timeout=2) as r:ready=r.status==200
    if ready:break
   except OSError:pass
   time.sleep(1)
  if not ready:raise RuntimeError('Gateway health failed')
 except Exception:
  put(backup/'server.py',target,owner);restart();raise
 print('Journal installed. Link only verified per-client/user source_account IDs to local accounts. Existing calls using the shared master key record metadata only; website content must use verified Supabase sync. Backup:',backup)
if __name__=='__main__':main()
