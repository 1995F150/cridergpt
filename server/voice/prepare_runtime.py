"""Prepare private add-ons without changing the existing ML environment."""
import argparse
import importlib.metadata
import json
import shutil
from pathlib import Path
import subprocess

ROOT=Path.home()/'cridergpt-voice'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 print('Plan: private venv/add-ons and independent snapshot of host ML packages under',ROOT,'; pinned public model downloads; pinned MIT OpenVoice source. Approximately 2–3 GiB disk. No training, paid APIs, root or production package updates.')
 if not args.apply:return
 venv=ROOT/'venv';host=Path('/opt/cridergpt-engine/venv/lib/python3.12/site-packages')
 if not host.exists():raise SystemExit('This host ML path was not found; inspect the target environment first')
 ROOT.mkdir(mode=0o700,exist_ok=True)
 snapshot=ROOT/'ml-runtime'
 if not snapshot.exists():shutil.copytree(host,snapshot,symlinks=True)
 if not (venv/'bin/python').exists():subprocess.run(['python3','-m','venv',str(venv)],check=True)
 site=venv/'lib/python3.12/site-packages'
 (site/'crider_voice_runtime.pth').write_text(str(snapshot)+'\n')
 requirements=Path(__file__).with_name('runtime-addons.lock.txt')
 subprocess.run([str(venv/'bin/python'),'-m','pip','install','-r',str(requirements)],check=True)
 vendor=ROOT/'openvoice-source'
 if not vendor.exists():subprocess.run(['git','clone','--depth','1','https://github.com/myshell-ai/OpenVoice.git',str(vendor)],check=True)
 revision='74a1d147b17a8c3092dd5430504bd83ef6c7eb23'
 actual=subprocess.check_output(['git','-C',str(vendor),'rev-parse','HEAD']).decode().strip()
 if actual!=revision:
  if subprocess.check_output(['git','-C',str(vendor),'status','--porcelain']).strip():raise SystemExit('Existing source is dirty; no changes made')
  subprocess.run(['git','-C',str(vendor),'fetch','--depth','1','origin',revision],check=True)
  subprocess.run(['git','-C',str(vendor),'checkout','--detach',revision],check=True)
 subprocess.run([str(venv/'bin/python'),str(Path(__file__).with_name('fetch_models.py')),'--root',str(ROOT/'models')],check=True)
 print('Private runtime prepared. No service has been installed or restarted.')
if __name__=='__main__':main()
