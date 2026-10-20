"""Local operator commands, never a public key-issuance endpoint."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from auth import AuthStore,SCOPES
ROOT=Path.home()/'cridergpt-voice'
def main():
 parser=argparse.ArgumentParser();sub=parser.add_subparsers(dest='command',required=True)
 issue=sub.add_parser('issue-key');issue.add_argument('--owner',required=True);issue.add_argument('--label',required=True);issue.add_argument('--scopes',default=','.join(sorted(SCOPES)));issue.add_argument('--output',type=Path,required=True)
 revoke=sub.add_parser('revoke-key');revoke.add_argument('--file',type=Path,required=True)
 backup=sub.add_parser('backup');backup.add_argument('--destination',type=Path,required=True)
 args=parser.parse_args()
 if args.command=='backup':
  if subprocess.run(['systemctl','--user','is-active','--quiet','cridergpt-voice.service']).returncode==0:raise SystemExit('Stop only cridergpt-voice.service before taking a consistent state/reference backup')
  if args.destination.exists():raise SystemExit('Backup destination already exists; no overwrite')
  source=(ROOT/'state').resolve()
  if args.destination.resolve().is_relative_to(source):raise SystemExit('Backup destination must be outside voice state')
  if any(path.is_symlink() for path in source.rglob('*')):raise SystemExit('Unexpected state symlink; inspect before backup')
  shutil.copytree(ROOT/'state',args.destination,symlinks=False);args.destination.chmod(0o700)
  print('Private state/key/reference backup created. Treat it as sensitive; revocation must also be applied to retained backups.')
  return
 store=AuthStore(ROOT/'state')
 try:
  if args.command=='issue-key':
   # Create the output exclusively before issuing a key: no accidental replacement.
   fd=os.open(args.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   try:
    with os.fdopen(fd,'w') as stream:
     token=store.issue(args.owner,args.label,set(args.scopes.split(',')))
     stream.write(token+'\n')
   except BaseException:
    args.output.unlink(missing_ok=True);raise
   print('Scoped key saved privately to:',args.output)
  else:store.revoke(args.file.read_text().strip());print('Key revoked; no key content was logged')
 finally:store.close()
if __name__=='__main__':main()
