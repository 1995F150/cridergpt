"""Offline, read-only model adapter. Never calls production chat/tool routes."""
import hashlib
import json
import os
from pathlib import Path
import time

os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',TOKENIZERS_PARALLELISM='false',CUDA_VISIBLE_DEVICES='',OMP_NUM_THREADS='1')

def digest(path):
    with Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

class ContextLimit(ValueError):pass

class OfflineModel:
    def __init__(self,entry,max_new_tokens=256,max_seconds=40):
        if not 1<=max_new_tokens<=512 or not 1<=max_seconds<=90:raise ValueError('Invalid generation budget')
        self.entry=entry;self.max_new_tokens=max_new_tokens;self.max_seconds=max_seconds
        path=Path(entry['path'])
        if digest(path/'model.safetensors')!=entry['sha256']:raise ValueError('Checkpoint mismatch')
        import torch
        from transformers import AutoTokenizer,AutoModelForCausalLM
        self.torch=torch;torch.set_num_threads(1)
        self.tokenizer=AutoTokenizer.from_pretrained(path,local_files_only=True,trust_remote_code=False)
        self.model=AutoModelForCausalLM.from_pretrained(path,local_files_only=True,trust_remote_code=False,use_safetensors=True,dtype=torch.float32,attn_implementation='eager').cpu().eval()
        if max(self.tokenizer.get_vocab().values())>=self.model.get_input_embeddings().num_embeddings:raise ValueError('Tokenizer mismatch')
        if not all(torch.isfinite(parameter).all() for parameter in self.model.parameters()):raise ValueError('Nonfinite weights')
        if self.model.generation_config.eos_token_id!=self.tokenizer.eos_token_id:raise ValueError('EOS mismatch')
        self.calls=0
    def __call__(self,messages):
        inputs=self.tokenizer.apply_chat_template(messages,tokenize=True,add_generation_prompt=True,return_tensors='pt',return_dict=True)
        count=inputs['input_ids'].shape[1]
        if count+self.max_new_tokens>self.entry['context_budget']:raise ContextLimit('Prompt plus response exceeds the planning context budget; no truncation')
        start=time.monotonic();self.calls+=1
        with self.torch.inference_mode():
            output=self.model.generate(**inputs,max_new_tokens=self.max_new_tokens,max_time=self.max_seconds,do_sample=False,use_cache=True,pad_token_id=self.tokenizer.eos_token_id,eos_token_id=self.tokenizer.eos_token_id)
        elapsed=time.monotonic()-start;tokens=output[0,count:]
        finish='eos' if len(tokens) and tokens[-1].item()==self.tokenizer.eos_token_id else 'token_limit' if len(tokens)>=self.max_new_tokens else 'server_timeout' if elapsed>=self.max_seconds else 'unknown'
        return {'response':self.tokenizer.decode(tokens,skip_special_tokens=True),'model':self.entry['id'],'checkpoint_sha256':self.entry['sha256'],
                'input_tokens':count,'output_tokens':len(tokens),'seconds':round(elapsed,4),'tokens_per_second':round(len(tokens)/elapsed,3),
                'finish_reason':finish,'incomplete':finish!='eos','generation_call':self.calls}
