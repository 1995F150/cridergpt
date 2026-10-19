"""Root-only Local Chat deployment, plan-only by default; no model changes."""
import argparse,hashlib,json,os,shutil,subprocess,time
from pathlib import Path
P=Path(__file__).resolve().parent

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 subprocess.run(['python3',str(P/'prepare_local.py')],check=True)
 manifest=json.loads((P/'local-manifest.json').read_text())
 print('Plan: back up and update Local Chat route and HTML, then restart only cridergpt-engine.service. Requires the separately installed and verified vision helper; no database/checkpoint/key changes.')
 if not args.apply:return
 if os.geteuid()!=0:raise SystemExit('Protected Engine files require root; no changes made.')
 if not Path('/home/cridergpt2026/cridergpt-vision-assist/code/vision_bridge.py').exists():raise SystemExit('Install and verify the isolated helper first')
 def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
 for name,m in manifest.items():
  if sha(Path(m['target']))!=m['before'] or sha(P/'stage'/('local-'+name))!=m['after']:raise SystemExit('Source changed; rebuild/review patch')
 backup=Path('/opt/cridergpt-engine')/('vision-backup-'+str(time.time_ns()));backup.mkdir(mode=0o700)
 def replace(source,target):
  target=Path(target);st=target.stat();temp=target.with_name(target.name+'.vision-install');shutil.copyfile(source,temp);os.chown(temp,st.st_uid,st.st_gid);os.chmod(temp,st.st_mode&0o777);os.replace(temp,target)
 for name,m in manifest.items():shutil.copy2(m['target'],backup/name)
 try:
  for name,m in manifest.items():replace(P/'stage'/('local-'+name),m['target'])
  subprocess.run(['systemctl','restart','cridergpt-engine.service'],check=True)
 except Exception:
  for name,m in manifest.items():replace(backup/name,m['target'])
  subprocess.run(['systemctl','restart','cridergpt-engine.service'],check=False);raise
 print('Installed. Verify authenticated Local Chat text and image requests. Backup:',backup)
if __name__=='__main__':main()
