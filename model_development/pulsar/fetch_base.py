"""Fetch a pinned public base once. Never replaces a differing existing checkpoint."""
import hashlib,json,os
from pathlib import Path
P=Path(__file__).resolve().parent
def main():
 config=json.loads((P/'config.json').read_text())['base'];target=Path(config['path']);weights=target/'model.safetensors'
 if not weights.exists():
  os.environ.update(HF_HUB_DISABLE_XET='1',HF_HUB_DISABLE_PROGRESS_BARS='1')
  from huggingface_hub import snapshot_download
  snapshot_download(config['repo'],revision=config['revision'],local_dir=target,allow_patterns=['*.json','*.txt','README.md','LICENSE*','model.safetensors'],token=False,max_workers=2)
 with weights.open('rb') as f:
  if hashlib.file_digest(f,'sha256').hexdigest()!=config['weights_sha256']:raise ValueError('Existing weights differ; do not overwrite them')
 hashes={}
 for name in ['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','generation_config.json']:
  hashes[name]=hashlib.sha256((target/name).read_bytes()).hexdigest()
 model_config=json.loads((target/'config.json').read_text())
 manifest={**config,'weights_bytes':weights.stat().st_size,'file_sha256':hashes,'architecture':model_config['architectures'],'upstream_context_positions':model_config['max_position_embeddings'],'training_performed':False}
 (P/'base-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Pinned base verified; source weights preserved.')
if __name__=='__main__':main()
