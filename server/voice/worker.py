"""Private persistent CPU speech worker. JSON lines only; no external providers.

OpenVoice conversion operations follow its MIT-licensed reference implementation:
https://github.com/myshell-ai/OpenVoice (pinned in the installation manifest).
"""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',CUDA_VISIBLE_DEVICES='-1',TOKENIZERS_PARALLELISM='false',OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',NUMBA_NUM_THREADS='1')
import base64
import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import time
import wave

ROOT=Path(os.environ.get('CRIDER_VOICE_ROOT',Path.home()/'cridergpt-voice'))

def decode_audio(raw,rate=16000,limit=30):
    if not raw or len(raw)>12*1024*1024:raise ValueError('audio_size')
    result=subprocess.run(['/usr/bin/ffmpeg','-nostdin','-v','error','-protocol_whitelist','pipe','-threads','1','-i','pipe:0','-t',str(limit+1),'-ac','1','-ar',str(rate),'-f','wav','pipe:1'],input=raw,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=15)
    if result.returncode:raise ValueError('invalid_audio')
    with wave.open(io.BytesIO(result.stdout),'rb') as wav:pcm=wav.readframes(rate*(limit+1)+1)
    duration=len(pcm)/(2*rate)
    if duration>limit:raise ValueError('audio_duration')
    output=io.BytesIO()
    with wave.open(output,'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(pcm)
    return output.getvalue(),pcm,duration

class Engine:
    def __init__(self):
        import torch
        import numpy as np
        import onnxruntime as ort
        from piper import PiperVoice,PiperConfig
        from transformers import WhisperFeatureExtractor,WhisperForConditionalGeneration,AutoTokenizer
        self.torch=torch;self.np=np
        torch.set_num_threads(1);torch.set_num_interop_threads(1)
        manifest=json.loads((ROOT/'models/manifest.json').read_text())
        for name,entry in manifest['models'].items():
            for filename,info in entry['files'].items():
                with (ROOT/'models'/name/filename).open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=info['sha256']:raise ValueError('model_checksum')
        self.manifest=manifest
        whisper=ROOT/'models/whisper'
        self.features=WhisperFeatureExtractor.from_pretrained(whisper,local_files_only=True)
        self.tokenizer=AutoTokenizer.from_pretrained(whisper,local_files_only=True,trust_remote_code=False)
        self.stt=WhisperForConditionalGeneration.from_pretrained(whisper,local_files_only=True,trust_remote_code=False,dtype=torch.float32,attn_implementation='eager').eval()
        piper=ROOT/'models/piper/en/en_US/ljspeech/medium/en_US-ljspeech-medium.onnx'
        options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
        session=ort.InferenceSession(str(piper),sess_options=options,providers=['CPUExecutionProvider'])
        self.tts=PiperVoice(session=session,config=PiperConfig.from_dict(json.loads(Path(str(piper)+'.json').read_text())))
        sys.path.insert(0,str(ROOT/'openvoice-source'))
        from openvoice.models import SynthesizerTrn
        from openvoice.utils import get_hparams_from_file
        converter=ROOT/'models/converter/converter'
        self.hps=get_hparams_from_file(converter/'config.json')
        self.converter=SynthesizerTrn(len(getattr(self.hps,'symbols',[])),self.hps.data.filter_length//2+1,n_speakers=self.hps.data.n_speakers,**self.hps.model).eval()
        state=torch.load(converter/'checkpoint.pth',map_location='cpu',weights_only=True)
        self.converter.load_state_dict(state['model'],strict=True)
        self.embeddings={}
        self.source_embedding=None
        for model in (self.stt,self.converter):
            if not all(torch.isfinite(p).all() for p in model.parameters()):raise ValueError('nonfinite_weights')

    def stock(self,text):
        if not isinstance(text,str) or not text.strip() or len(text)>300:raise ValueError('text_limit')
        output=io.BytesIO()
        with wave.open(output,'wb') as wav:self.tts.synthesize_wav(text, wav)
        raw=output.getvalue()
        with wave.open(io.BytesIO(raw),'rb') as wav:duration=wav.getnframes()/wav.getframerate()
        if duration>45:raise ValueError('output_duration')
        return raw,duration

    def spectrogram(self,raw):
        torch=self.torch;np=self.np;hps=self.hps.data
        _,pcm,_=decode_audio(raw,rate=hps.sampling_rate,limit=120)
        samples=np.frombuffer(pcm,dtype='<i2').astype(np.float32)/32768
        y=torch.from_numpy(samples).unsqueeze(0)
        pad=(hps.filter_length-hps.hop_length)//2
        y=torch.nn.functional.pad(y.unsqueeze(1),(pad,pad),mode='reflect').squeeze(1)
        spec=torch.stft(y,hps.filter_length,hop_length=hps.hop_length,win_length=hps.win_length,window=torch.hann_window(hps.win_length),center=False,normalized=False,onesided=True,return_complex=True)
        return torch.sqrt(spec.real.square()+spec.imag.square()+1e-6)

    def embedding(self,raw):
        with self.torch.inference_mode():return self.converter.ref_enc(self.spectrogram(raw).transpose(1,2)).unsqueeze(-1).detach()

    def speech(self,text,reference=None):
        raw,duration=self.stock(text)
        if not reference:return dict(audio=base64.b64encode(raw).decode(),mime='audio/wav',seconds=duration,model='piper-ljspeech-medium',cloned=False,synthetic=True,finish_reason='completed')
        ref=Path(reference).read_bytes()
        digest=hashlib.sha256(ref).hexdigest()
        if digest not in self.embeddings:
            if len(self.embeddings)>=4:self.embeddings.clear()
            self.embeddings[digest]=self.embedding(ref)
        if self.source_embedding is None:
            source,_=self.stock('This is a reference sentence for the standard speech voice. It provides a stable source speaker for the local conversion system.')
            self.source_embedding=self.embedding(source)
        torch=self.torch
        with torch.inference_mode():
            spec=self.spectrogram(raw)
            audio=self.converter.voice_conversion(spec,torch.tensor([spec.shape[-1]]),sid_src=self.source_embedding,sid_tgt=self.embeddings[digest],tau=.3)[0][0,0].cpu().float().numpy()
        if not self.np.isfinite(audio).all():raise ValueError('nonfinite_audio')
        pcm=(self.np.clip(audio,-1,1)*32767).astype('<i2').tobytes()
        output=io.BytesIO()
        with wave.open(output,'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(self.hps.data.sampling_rate);wav.writeframes(pcm)
        return dict(audio=base64.b64encode(output.getvalue()).decode(),mime='audio/wav',seconds=len(audio)/self.hps.data.sampling_rate,model='openvoice-v2+piper-ljspeech-medium',cloned=True,synthetic=True,watermark='not_embedded',finish_reason='completed')

    def transcribe(self,raw):
        torch=self.torch;np=self.np
        _,pcm,duration=decode_audio(raw,limit=30)
        samples=np.frombuffer(pcm,dtype='<i2').astype(np.float32)/32768
        if len(samples)<1600 or float(np.sqrt(np.mean(samples*samples)))<.005:return dict(text='',finish_reason='silence',seconds=duration,model='whisper-tiny.en')
        inputs=self.features(samples,sampling_rate=16000,return_tensors='pt',return_attention_mask=True)
        with torch.inference_mode():
            out=self.stt.generate(**inputs,max_new_tokens=128,max_time=25,do_sample=False,return_dict_in_generate=True)
        ids=out.sequences[0]
        eos=self.stt.generation_config.eos_token_id;eos=[eos] if isinstance(eos,int) else eos
        finish='eos' if ids[-1].item() in eos else 'generation_limit'
        text=self.tokenizer.decode(ids,skip_special_tokens=True).strip()
        return dict(text=text,finish_reason=finish,incomplete=finish!='eos',seconds=duration,model='whisper-tiny.en')

    def process(self,request):
        operation=request.get('operation')
        if operation=='speech':return self.speech(request['text'],request.get('reference'))
        raw=base64.b64decode(request['audio'],validate=True)
        if operation=='transcribe':return self.transcribe(raw)
        if operation=='normalize':
            wav,_,duration=decode_audio(raw,limit=120)
            return dict(audio=base64.b64encode(wav).decode(),seconds=duration)
        raise ValueError('unknown_operation')

def main():
    output=sys.stdout
    with contextlib.redirect_stdout(sys.stderr):engine=Engine()
    output.write(json.dumps({'ready':True,'models':['whisper-tiny.en','piper-ljspeech-medium','openvoice-v2']})+'\n');output.flush()
    for line in sys.stdin:
        tick=time.monotonic()
        try:
            if len(line)>18*1024*1024:raise ValueError('request_size')
            with contextlib.redirect_stdout(sys.stderr):result=engine.process(json.loads(line))
            result['latency_ms']=round((time.monotonic()-tick)*1000)
        except Exception as error:
            category=str(error) if isinstance(error,ValueError) and str(error) in {'audio_size','invalid_audio','audio_duration','text_limit','output_duration','unknown_operation'} else 'internal_error'
            result={'error':category,'finish_reason':'invalid_input' if category!='internal_error' else 'internal_error'}
        output.write(json.dumps(result)+'\n');output.flush()
if __name__=='__main__':main()
