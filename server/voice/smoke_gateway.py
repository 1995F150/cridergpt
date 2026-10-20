"""Opt-in isolated HTTP test of staged gateway against the running Unix worker."""
import argparse
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import sys
import threading
import time
import uuid

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--stage',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--live',action='store_true');args=parser.parse_args()
    if not args.live:raise SystemExit('Use --live to run a real generated speech fixture.')
    if args.output.exists():raise SystemExit('No overwrite')
    sys.path[:0]=[str(args.stage),str(Path.home()/'cridergpt-chat-api')]
    spec=importlib.util.spec_from_file_location('isolated_audio_gateway',args.stage/'server.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    # Only a new ephemeral loopback listener with a fixture credential. Existing
    # production API/service/key/configuration is never changed.
    server=module.API(('127.0.0.1',0),'fixture-master',key_validator=lambda key:False)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    users=[str(uuid.uuid4()),str(uuid.uuid4())];identifier=None
    def request(method,path,body=None,user=None):
        conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=15)
        try:
            conn.request(method,path,None if body is None else json.dumps(body),{'Authorization':'Bearer fixture-master','X-CriderGPT-User':user or users[0],'Content-Type':'application/json'})
            result=conn.getresponse();return result.status,json.loads(result.read())
        finally:conn.close()
    try:
        status,catalog=request('GET','/v1/audio/voices');assert status==200 and any(v['id']=='stock' for v in catalog['voices'])
        status,created=request('POST','/v1/audio/jobs',{'operation':'speech','text':'This speech came through the existing API route contract.','voice_id':'stock'});assert status==202;identifier=created['id']
        denied,_=request('GET','/v1/audio/jobs/'+identifier,user=users[1]);assert denied==404
        deadline=time.monotonic()+70
        while time.monotonic()<deadline:
            status,job=request('GET','/v1/audio/jobs/'+identifier);assert status==200
            if job['status'] not in ('queued','running'):break
            time.sleep(.25)
        assert job['status']=='completed' and job['result']['mime']=='audio/wav' and not job['result']['cloned']
        report={'catalog_voices':len(catalog['voices']),'same_api_paths':True,'actual_local_speech':True,'speech_model':job['result']['model'],'cross_owner_result_status':denied,'public_gateway_changed':False,'human_voice_used':False,'new_public_url':False}
        args.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
    finally:
        if identifier:request('POST','/v1/audio/jobs/'+identifier+'/cancel',{})
        server.shutdown();server.server_close();thread.join(timeout=5)
        # Remove only this probe's newly issued test credentials. Keep revocation
        # rows and content-free worker telemetry; no real caller's state touched.
        from auth import AuthStore
        store=AuthStore(Path.home()/'cridergpt-voice/state')
        try:
            for user in users:
                path=Path.home()/'cridergpt-voice/state/gateway-keys'/(hashlib.sha256(('web_'+user).encode()).hexdigest()+'.json')
                if path.exists():store.revoke(json.loads(path.read_text())['token']);path.unlink()
        finally:store.close()

if __name__=='__main__':main()
