"""Real local inference probe with generated fixture audio, never a human voice."""
import base64
import hashlib
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time
import wave
import io

P=Path(__file__).resolve().parent;ROOT=Path(os.environ.get('CRIDER_VOICE_ROOT',Path.home()/'cridergpt-voice'))
def main():
 started=time.monotonic();child=subprocess.Popen([sys.executable,str(P/'worker.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
 temporary=ROOT/'state/generated-fixture-reference.wav';temporary.parent.mkdir(exist_ok=True,mode=0o700)
 try:
  hello=json.loads(child.stdout.readline());assert hello.get('ready')
  loaded=time.monotonic()-started
  def call(payload):
   tick=time.monotonic();child.stdin.write(json.dumps(payload)+'\n');child.stdin.flush();response=json.loads(child.stdout.readline())
   if response.get('error'):raise RuntimeError(json.dumps(response))
   return response,time.monotonic()-tick
  phrase='The local voice service is running on the server. This is a generated test recording, not a recording of a person who owns this application.'
  speech,tts_seconds=call({'operation':'speech','text':phrase})
  raw=base64.b64decode(speech['audio']);temporary.write_bytes(raw);temporary.chmod(0o600)
  transcript,stt_seconds=call({'operation':'transcribe','audio':speech['audio']})
  clone,conversion_seconds=call({'operation':'speech','text':'This is a local voice conversion pipeline test.','reference':str(temporary)})
  silence=io.BytesIO()
  with wave.open(silence,'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(b'\0'*16000*2*2)
  blank,_=call({'operation':'transcribe','audio':base64.b64encode(silence.getvalue()).decode()});assert blank['finish_reason']=='silence' and not blank['text']
  report=dict(loaded_models=hello['models'],load_seconds=loaded,tts_inference_seconds=tts_seconds,tts_audio_seconds=speech['seconds'],tts_real_time_factor=tts_seconds/speech['seconds'],stt_inference_seconds=stt_seconds,generated_reference_text=phrase,transcription=transcript,conversion_inference_seconds=conversion_seconds,converted_audio_seconds=clone['seconds'],conversion_executed=clone['cloned'],human_voice_used=False,speaker_similarity_measured=False,silence_test_passed=True,public_chat_connected=False,production_ready=False)
  output=ROOT/'state/inference-probe.json';output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
 finally:
  temporary.unlink(missing_ok=True);child.terminate()
  try:child.wait(timeout=3)
  except subprocess.TimeoutExpired:child.kill();child.wait()
if __name__=='__main__':main()
