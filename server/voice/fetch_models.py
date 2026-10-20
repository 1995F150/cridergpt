"""Fetch only pinned public speech assets; verify upstream LFS SHA256 where present."""
import argparse
import hashlib
import json
from pathlib import Path

SPECS = [
 ('whisper','openai/whisper-tiny.en','87c7102498dcde7456f24cfd30239ca606ed9063','apache-2.0',[
  'model.safetensors','config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','added_tokens.json','merges.txt','normalizer.json','vocab.json']),
 ('piper','rhasspy/piper-voices','c10ece1aade47bb51c153c893d14e5bf8e5b7117','voice model card: LJ Speech public-domain data; engine GPL-3.0',[
  'en/en_US/ljspeech/medium/en_US-ljspeech-medium.onnx','en/en_US/ljspeech/medium/en_US-ljspeech-medium.onnx.json','en/en_US/ljspeech/medium/MODEL_CARD']),
 ('converter','myshell-ai/OpenVoiceV2','f36e7edfe1684461a8343844af60babc2efbb727','mit',[
  'converter/checkpoint.pth','converter/config.json','README.md']),
]

def main():
 from huggingface_hub import HfApi,hf_hub_download
 parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);args=parser.parse_args()
 manifest={'format':1,'models':{},'paid_services':False,'human_voice_enrolled':False}
 for name,repo,revision,license,files in SPECS:
  info=HfApi(token=False).model_info(repo,revision=revision,files_metadata=True)
  assert info.sha==revision
  upstream={f.rfilename:f for f in info.siblings}
  entry={'repo':repo,'revision':revision,'license':license,'files':{}}
  for filename in files:
   path=Path(hf_hub_download(repo,filename,revision=revision,local_dir=args.root/name,token=False))
   with path.open('rb') as stream:sha=hashlib.file_digest(stream,'sha256').hexdigest()
   lfs=getattr(upstream[filename],'lfs',None);expected=getattr(lfs,'sha256',None)
   if expected and expected!=sha:raise ValueError('Upstream checksum mismatch: '+filename)
   entry['files'][filename]={'sha256':sha,'bytes':path.stat().st_size,'upstream_lfs_verified':bool(expected)}
  manifest['models'][name]=entry
 args.root.mkdir(parents=True,exist_ok=True)
 destination=args.root/'manifest.json'
 if destination.exists() and json.loads(destination.read_text())!=manifest:raise ValueError('Existing model manifest differs; no overwrite')
 destination.write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'models':list(manifest['models']),'manifest':str(destination)}))
if __name__=='__main__':main()
