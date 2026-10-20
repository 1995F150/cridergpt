"""Authenticated real Unix-socket probe. Uses/deletes only a generated test reference."""
import base64
import json
import os
from pathlib import Path
import time
import httpx

ROOT=Path.home()/'cridergpt-voice'
def main():
 socket=Path(os.environ.get('XDG_RUNTIME_DIR',f'/run/user/{os.getuid()}'))/'cridergpt-voice/api.sock'
 token=(ROOT/'state/operator.key').read_text().strip()
 transport=httpx.HTTPTransport(uds=str(socket));client=httpx.Client(transport=transport,base_url='http://voice',timeout=10)
 headers={'Authorization':'Bearer '+token};voice=None
 def submit(**payload):
  response=client.post('/v1/jobs',json=payload,headers=headers);response.raise_for_status();return response.json()['id']
 def wait(identifier):
  deadline=time.monotonic()+100
  while time.monotonic()<deadline:
   response=client.get('/v1/jobs/'+identifier,headers=headers);response.raise_for_status();job=response.json()
   if job['status'] not in ('queued','running'):
    if job['status']!='completed':raise RuntimeError('Unexpected voice status: '+job['status'])
    return job['result']
   time.sleep(.15)
  raise RuntimeError('Voice job did not finish')
 try:
  assert client.get('/v1/status').status_code==401
  before={v['id'] for v in client.get('/v1/voices',headers=headers).json()['voices']}
  phrase='The local voice service is running on the server. This generated recording checks private speech processing without using a human reference.'
  speech=wait(submit(operation='speech',text=phrase,voice_id='stock'));assert not speech['cloned']
  transcript=wait(submit(operation='transcribe',audio=speech['audio']));assert transcript['finish_reason']=='eos'
  response=client.post('/v1/voices',headers=headers,json={'audio':speech['audio'],'label':'GENERATED_SMOKE_FIXTURE','consent':'authorized','evidence':'Locally generated public-domain-model speech fixture; no human voice reference. Delete after test.'});response.raise_for_status();voice=response.json()['id']
  clone=wait(submit(operation='speech',text='This is a private reference conversion test.',voice_id=voice));assert clone['cloned'] and clone['synthetic']
  identifier=submit(operation='speech',text='The local voice service must stop generating this response when a cancellation arrives. '*3)
  time.sleep(.05);response=client.post('/v1/jobs/'+identifier+'/cancel',headers=headers);response.raise_for_status();assert response.json()['status']=='cancelled'
  recovered=wait(submit(operation='speech',text='The voice worker recovered after cancellation.'));assert recovered['finish_reason']=='completed'
  response=client.delete('/v1/voices/'+voice,headers=headers);response.raise_for_status();voice=None
  assert {v['id'] for v in client.get('/v1/voices',headers=headers).json()['voices']}==before
  warmed=wait(submit(operation='speech',text='The private local voice service is ready for an authorized recording.'))
  report=dict(unauthorized_rejected=True,stock_speech_completed=True,transcription=transcript,reference_conversion_completed=clone['cloned'],cancellation_completed=True,recovery_completed=True,test_reference_deleted=True,human_reference_used=False,public_chat_connected=False,production_ready=False,last_model=warmed['model'])
  output=ROOT/'state/service-smoke.json';output.write_text(json.dumps(report,indent=2)+'\n');output.chmod(0o600);print(json.dumps(report,indent=2))
 finally:
  if voice:client.delete('/v1/voices/'+voice,headers=headers)
  client.close()
if __name__=='__main__':main()
