"""Stage same-API audio routes; never overwrite/restart a running gateway."""
import argparse
import difflib
import hashlib
import json
from pathlib import Path

def stage(source,destination):
    source=Path(source);destination=Path(destination);original=(source/'server.py').read_text()
    marker="  if self.command=='GET' and self.path=='/v1/models':"
    if original.count(marker)!=1 or 'AudioGateway' in original:raise ValueError('Gateway version changed; inspect before staging')
    updated=original.replace('from engine_keys import', 'from audio_gateway import AudioGateway\nfrom engine_keys import',1)
    updated=updated.replace("REGISTRY=ROOT/'model-catalog.json'", "REGISTRY=ROOT/'model-catalog.json'\nAUDIO=AudioGateway()",1)
    updated=updated.replace(marker,"  if AUDIO.handle(self,self.server.key):return\n"+marker,1)
    destination.mkdir(mode=0o700,parents=False,exist_ok=False)
    (destination/'server.py').write_text(updated)
    (destination/'audio_gateway.py').write_text(Path(__file__).with_name('audio_gateway.py').read_text().replace('from auth import AuthStore','from voice_gateway_auth import AuthStore'))
    (destination/'voice_gateway_auth.py').write_bytes(Path(__file__).with_name('auth.py').read_bytes())
    (destination/'server.py.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),updated.splitlines(True),fromfile='server.py',tofile='server.py')))
    (destination/'audio-filesystem.conf').write_text('[Service]\nReadWritePaths='+str(Path.home()/'cridergpt-voice/state')+'\n')
    (destination/'manifest.json').write_text(json.dumps({'source_sha256':hashlib.sha256(original.encode()).hexdigest(),'deployed':False,'new_public_url':False,'files':['server.py','audio_gateway.py','voice_gateway_auth.py'],'stage_sha256':{name:hashlib.sha256((destination/name).read_bytes()).hexdigest() for name in ('server.py','audio_gateway.py','voice_gateway_auth.py','audio-filesystem.conf')}},indent=2)+'\n')
    for path in destination.iterdir():path.chmod(0o600)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,default=Path.home()/'cridergpt-chat-api');parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();stage(args.source,args.output)
    print('Staged only. Review manifest/diff and gateway filesystem permissions before any deployment. No service restarted.')
