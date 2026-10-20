"""Local operator call bridge: existing native API + private speech jobs.

No model is loaded here, no external endpoint/fallback is accepted, and credentials
stay on this server. A public gateway must supply verified user-scoped credentials;
never expose this operator CLI or its keys to a browser.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import socket
import http.client
import time


class CallError(RuntimeError):
    pass


def speech_chunks(text):
    """Preserve every character, with bounded jobs matching the preview contract."""
    chunks=[]
    while text:
        end=min(len(text),300)
        if end<len(text):
            boundary=max(text.rfind('. ',0,end),text.rfind('? ',0,end),text.rfind('! ',0,end))
            if boundary>=100:end=boundary+2
            else:
                boundary=text.rfind(' ',0,end)
                if boundary>0:end=boundary+1
        chunks.append(text[:end]);text=text[end:]
    if not chunks or len(chunks)>8:raise CallError('Answer exceeds the eight-part speech limit; read the text instead.')
    return chunks


def turn(audio,model,history,voice_id,voice_job,native_chat):
    """Transport-independent turn. The caller owns session/history and playback."""
    if not isinstance(model,str) or not re.fullmatch(r'[a-zA-Z0-9_.-]{1,100}',model):raise CallError('Use an exact registered native model ID.')
    if not isinstance(history,list) or len(history)>10:raise CallError('History must contain at most ten messages.')
    for message in history:
        if not isinstance(message,dict) or set(message)!={'role','content'} or message['role'] not in ('user','assistant') or not isinstance(message['content'],str) or not 0<len(message['content'])<=6000:raise CallError('Invalid history.')
    transcript=voice_job({'operation':'transcribe','audio':audio})
    if transcript.get('incomplete') or transcript.get('error') or transcript.get('finish_reason') not in ('eos','silence'):raise CallError('Transcription was incomplete; no text-model request was sent.')
    question=transcript.get('text','').strip()
    if not question:return {'status':'silence','history':history,'audio_parts':[]}
    messages=[*history,{'role':'user','content':question}]
    reply=native_chat({'model':model,'messages':messages,'routing':'text','stream':False})
    if reply.get('model')!=model:raise CallError('Native checkpoint identity mismatch; no speech was generated.')
    answer=reply.get('response')
    if not isinstance(answer,str) or not answer.strip():raise CallError('The native model returned no answer.')
    result={'status':'text_only','transcript':question,'response':answer,'model':reply['model'],
            'native_request_id':reply.get('request_id'),'finish_reason':reply.get('finish_reason'),
            'audio_parts':[],'history':history,'synthetic':True,'external_fallback':False}
    if reply.get('incomplete') or reply.get('output_limit_reached') or reply.get('finish_reason') not in ('eos','stop','completed'):
        result['error']='Native answer incomplete; speech was withheld.';return result
    result['history']=[*messages,{'role':'assistant','content':answer}][-10:]
    try:
        for text in speech_chunks(answer):
            speech=voice_job({'operation':'speech','text':text,'voice_id':voice_id})
            if speech.get('error') or speech.get('incomplete') or speech.get('finish_reason')!='completed' or not speech.get('audio'):raise CallError('Speech failed; the complete answer remains available as text.')
            if bool(speech.get('cloned'))!=(voice_id!='stock'):raise CallError('Voice identity mismatch; playback withheld.')
            result['audio_parts'].append(speech)
    except Exception:
        # Never deliver partial audio as if it were a complete answer.
        result['audio_parts']=[];result['error']='Speech unavailable or limited; read the complete text answer.';return result
    result['status']='completed';result['voice_id']=voice_id
    return result


class UnixConnection(http.client.HTTPConnection):
    def __init__(self,path):super().__init__('localhost',timeout=10);self.path=str(path)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect(self.path)


class LocalTransport:
    def __init__(self,voice_key,chat_key):
        self.voice_key=voice_key;self.chat_key=chat_key
        self.socket=Path('/run/user')/str(os.getuid())/'cridergpt-voice/api.sock'
        self.pending=None
    def request(self,voice,method,path,body=None):
        conn=UnixConnection(self.socket) if voice else http.client.HTTPConnection('127.0.0.1',8772,timeout=100)
        try:
            conn.request(method,path,None if body is None else json.dumps(body).encode(),{'Authorization':'Bearer '+(self.voice_key if voice else self.chat_key),'Content-Type':'application/json'})
            response=conn.getresponse();raw=response.read(17*1024*1024+1)
            if response.status>=400 or len(raw)>17*1024*1024:raise CallError('Local voice/native request failed (HTTP '+str(response.status)+').')
            return json.loads(raw)
        finally:conn.close()
    def voice(self,payload):
        self.pending=self.request(True,'POST','/v1/jobs',payload)['id'];deadline=time.monotonic()+105
        try:
            while time.monotonic()<deadline:
                job=self.request(True,'GET','/v1/jobs/'+self.pending)
                if job['status'] not in ('queued','running'):
                    if job['status']!='completed':raise CallError('Local speech job '+job['status'])
                    return job['result']
                time.sleep(.2)
            raise CallError('Local speech deadline exceeded.')
        finally:
            identifier=self.pending;self.pending=None
            try:self.request(True,'POST','/v1/jobs/'+identifier+'/cancel',{})
            except Exception:pass
    def chat(self,payload):return self.request(False,'POST','/v1/chat',payload)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audio',type=Path,required=True);parser.add_argument('--model',required=True)
    parser.add_argument('--voice-id',default='stock');parser.add_argument('--history',type=Path)
    parser.add_argument('--voice-key',type=Path,default=Path.home()/'cridergpt-voice/state/operator.key')
    parser.add_argument('--chat-key',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.audio.stat().st_size>2*1024*1024:raise SystemExit('Audio exceeds 2 MiB; use an utterance of at most 30 seconds.')
    # Exclusive private directory: no overwrite and no transcript/audio in Git/logs.
    args.output.mkdir(mode=0o700,parents=False,exist_ok=False)
    transport=LocalTransport(args.voice_key.read_text().strip(),args.chat_key.read_text().strip())
    try:
        result=turn(base64.b64encode(args.audio.read_bytes()).decode(),args.model,
                    json.loads(args.history.read_text()) if args.history else [],args.voice_id,transport.voice,transport.chat)
        parts=result.pop('audio_parts')
        for index,part in enumerate(parts):
            path=args.output/f'speech-{index+1:02}.wav';path.write_bytes(base64.b64decode(part.pop('audio'),validate=True));path.chmod(0o600)
            part['file']=path.name
        result['audio_parts']=parts
        path=args.output/'turn.json';path.write_text(json.dumps(result,indent=2));path.chmod(0o600)
        print('Local turn saved privately. Status:',result['status'])
    except (CallError,KeyboardInterrupt):
        print('Turn failed or cancelled. No external fallback was used. Native inference already accepted by the existing worker may still finish.')
        raise SystemExit(1)


if __name__=='__main__':main()
