"""Review/install exact staged fixes; default is a read-only plan. Does not restart services."""
import argparse,hashlib,json,os,shutil,tempfile
from datetime import datetime,timezone
from pathlib import Path
P=Path(__file__).resolve().parent
args=argparse.ArgumentParser();args.add_argument('--apply',action='store_true');options=args.parse_args()
items=[json.loads((P/'manifest.json').read_text())]+json.loads((P/'edges-manifest.json').read_text())
pending=[]
for item in items:
 target=Path(item['target']);stage=P/'stage'/item.get('staged',target.name)
 installed_hash=hashlib.sha256(target.read_bytes()).hexdigest()
 if installed_hash==item['after']:
  print(f'Already installed: {target}');continue
 if installed_hash!=item['before']:raise SystemExit(f'Source changed; stop and regenerate/review patch: {target}')
 if hashlib.sha256(stage.read_bytes()).hexdigest()!=item['after']:raise SystemExit(f'Staged checksum mismatch: {stage}')
 compile(stage.read_text(),str(stage),'exec')
 pending.append(item)
 print(f'{target}  {item["before"][:12]} -> {item["after"][:12]}')
if not options.apply:
 print('Plan only. No files changed. Review patches and tests before --apply.');raise SystemExit()
items=pending
if not items:print('All patches already installed.');raise SystemExit()
backup=P/'backups'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');backup.mkdir(parents=True)
# Back up every original before making the first change.
for index,item in enumerate(items):shutil.copy2(item['target'],backup/(str(index)+'-'+Path(item['target']).name))
(backup/'manifest.json').write_text(json.dumps(items,indent=2))
try:
 for item in items:
  target=Path(item['target']);stage=P/'stage'/item.get('staged',target.name);stat=target.stat()
  fd,name=tempfile.mkstemp(prefix='.'+target.name+'.',dir=target.parent)
  try:
   with os.fdopen(fd,'wb') as f:f.write(stage.read_bytes());f.flush();os.fsync(f.fileno())
   os.chmod(name,stat.st_mode);os.chown(name,stat.st_uid,stat.st_gid);os.replace(name,target)
  finally:
   if os.path.exists(name):os.unlink(name)
except Exception:
 for index,item in enumerate(items):shutil.copy2(backup/(str(index)+'-'+Path(item['target']).name),item['target'])
 raise
print(f'Installed; originals saved in {backup}. No services restarted.')
