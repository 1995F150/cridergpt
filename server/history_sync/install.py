"""Explicit root deployment only; never called by build/tests or normal runtime."""
import argparse,hashlib,json,os,pwd,secrets,shutil,sqlite3,subprocess,time,uuid
from pathlib import Path
P=Path(__file__).resolve().parent
ENGINE=Path('/opt/cridergpt-engine');DEST=ENGINE/'native_chat_integration/history_sync'
CONFIG=Path('/etc/cridergpt-history-sync.json');SECRETS=Path('/etc/cridergpt-history-sync.env')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(source,target,uid,gid,mode=0o644):
 temporary=target.with_name(target.name+'.sync-install');shutil.copyfile(source,temporary);os.chown(temporary,uid,gid);os.chmod(temporary,mode);os.replace(temporary,target)
def main():
 a=argparse.ArgumentParser();a.add_argument('--cloud-user',required=True);a.add_argument('--local-user',default='owner');a.add_argument('--api-source',action='append',default=[]);a.add_argument('--apply',action='store_true');args=a.parse_args();account=str(uuid.UUID(args.cloud_user))
 subprocess.run(['python3',str(P/'prepare_local_patch.py')],check=True)
 manifest=json.loads((P/'local-manifest.json').read_text())
 print('Plan: add a restricted history-sync worker, additive SQLite tables, authenticated Local Chat sync page and read-only imports. One Engine restart; no model or existing key changes. Dedicated history-export secret required in Supabase. Local link:',args.local_user)
 if not args.apply:return
 if os.geteuid()!=0:raise SystemExit('sudo required for protected Engine files. No changes applied.')
 if DEST.exists() or CONFIG.exists() or SECRETS.exists() or SECRETS.with_suffix('.key').exists() or Path('/etc/systemd/system/cridergpt-history-sync.service').exists():raise SystemExit('An installation/config already exists; refusing to overwrite it.')
 for name,item in manifest.items():
  if sha(Path(item['target']))!=item['before'] or sha(P/'stage'/name)!=item['after']:raise SystemExit('Live/staged files changed; rebuild before installing.')
 with sqlite3.connect(ENGINE/'data/local_chat.sqlite3') as c:
  if args.local_user!='owner' and not c.execute('SELECT 1 FROM local_accounts WHERE id=?',(args.local_user,)).fetchone():raise SystemExit('Local account does not exist')
 owner=pwd.getpwnam('cridergpt');backup=ENGINE/('history-sync-backup-'+str(time.time_ns()));backup.mkdir(mode=0o700)
 for name,item in manifest.items():shutil.copy2(item['target'],backup/name)
 with sqlite3.connect('file:'+str(ENGINE/'data/local_chat.sqlite3')+'?mode=ro',uri=True) as src,sqlite3.connect(backup/'history.sqlite3') as dst:src.backup(dst)
 (backup/'manifest.json').write_text(json.dumps(manifest,indent=2))
 key=secrets.token_urlsafe(48)
 try:
  DEST.mkdir(mode=0o755)
  for name in ['replica.py','worker.py','local_routes.py','review.py','conversation_context.py']:put(P/name,DEST/name,owner.pw_uid,owner.pw_gid)
  (DEST/'__init__.py').touch();os.chown(DEST/'__init__.py',owner.pw_uid,owner.pw_gid)
  config={'endpoint':'https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/history-sync','database':str(ENGINE/'data/local_chat.sqlite3'),'key_file':str(SECRETS.with_suffix('.key')),'links':{account:args.local_user},'api_links':{str(uuid.UUID(k)):args.local_user for k in args.api_source}}
  for path,text in [(CONFIG,json.dumps(config,indent=2)),(SECRETS,'CRIDERGPT_HISTORY_SYNC_KEY='+key+'\nCRIDERGPT_HISTORY_SYNC_USER_IDS='+account+'\n'),(Path(config['key_file']),key+'\n')]:
   with path.open('x') as f:os.fchmod(f.fileno(),0o600);f.write(text)
   os.chown(path,owner.pw_uid,owner.pw_gid)
  for name,item in manifest.items():
   existing=Path(item['target']).stat();put(P/'stage'/name,Path(item['target']),existing.st_uid,existing.st_gid,existing.st_mode&0o777)
  put(P/'cridergpt-history-sync.service',Path('/etc/systemd/system/cridergpt-history-sync.service'),0,0)
  subprocess.run(['systemctl','daemon-reload'],check=True)
  subprocess.run(['systemctl','restart','cridergpt-engine.service'],check=True)
 except Exception:
  for path in [CONFIG,SECRETS,SECRETS.with_suffix('.key'),Path('/etc/systemd/system/cridergpt-history-sync.service')]:
   if path.exists():path.unlink()
  if DEST.exists():shutil.rmtree(DEST)
  subprocess.run(['systemctl','daemon-reload'],check=False)
  for name,item in manifest.items():
   target=Path(item['target']);st=target.stat();put(backup/name,target,st.st_uid,st.st_gid,st.st_mode&0o777)
  subprocess.run(['systemctl','restart','cridergpt-engine.service'],check=False)
  raise
 print('Installed but sync NOT STARTED. Complete approved Supabase migration/secret/function deployment, then run the backfill/one-shot verification before enabling the worker. Backup:',backup)
 print('Private export-secret file (never paste into chat):',SECRETS)
if __name__=='__main__':main()
