"""Prepare reversible diagnostic/runtime changes without modifying live services."""
import hashlib,json
from pathlib import Path
P=Path(__file__).resolve().parent;SOURCE=Path('/home/cridergpt2026/cridergpt-engine-verified/validation-tools/candidate_serving.py')
s=SOURCE.read_text();before=s
s=s.replace('import gc, hashlib, json, threading, time','import gc, hashlib, json, threading, time, logging, uuid',1)
s=s.replace('    def generate(self, name, messages, max_new_tokens=64, *, persona=False, personalization_context=""):', '''    def generate(self, name, messages, max_new_tokens=64, *, persona=False, personalization_context=""):
        request_id = uuid.uuid4().hex
        prompt_hash = hashlib.sha256(json.dumps(messages, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        started = time.monotonic()
        try:
            result = self._generate(name, messages, max_new_tokens, persona=persona, personalization_context=personalization_context)
        except Exception as error:
            logging.getLogger('cridergpt.request_audit').warning(json.dumps({'event':'candidate_generation','request_id':request_id,'model':name,'checkpoint':self.registry.get(name,{}).get('output_checkpoint'),'weights_sha256':self.registry.get(name,{}).get('weights_sha256'),'prompt_sha256':prompt_hash,'error_type':type(error).__name__,'status':'failure'}))
            raise
        response_hash = hashlib.sha256(result['response'].encode()).hexdigest()
        result.update(adapter_request_id=request_id, prompt_sha256=prompt_hash, response_sha256=response_hash)
        logging.getLogger('cridergpt.request_audit').info(json.dumps({'event':'candidate_generation','request_id':request_id,'model':name,'checkpoint':result.get('checkpoint'),'weights_sha256':result.get('weights_sha256'),'prompt_sha256':prompt_hash,'input_ids_sha256':result.get('input_ids_sha256'),'response_sha256':response_hash,'finish_reason':result.get('finish_reason'),'input_tokens':result.get('input_tokens'),'output_tokens':result.get('generated_tokens'),'duration_ms':round((time.monotonic()-started)*1000),'status':'success'}))
        return result

    def _generate(self, name, messages, max_new_tokens=64, *, persona=False, personalization_context=""):''',1)
old="                return self.tokenizer.apply_chat_template(items,tokenize=True,add_generation_prompt=True,return_tensors='pt')"
new="""                encoded = self.tokenizer.apply_chat_template(items, tokenize=True, add_generation_prompt=True, return_tensors='pt', return_dict=True)
                # Transformers versions differ in their default return type.
                # Explicitly extract this request's token tensor; never reuse prior IDs.
                return encoded['input_ids']"""
assert old in s;s=s.replace(old,new,1)
s=s.replace("return {**finish_metadata(finish),", "return {'input_ids_sha256':hashlib.sha256(ids.detach().cpu().contiguous().numpy().tobytes()).hexdigest(),**finish_metadata(finish),",1)
s=s.replace('class CandidateServing:', "_audit_logger = logging.getLogger('cridergpt.request_audit')\n_audit_logger.setLevel(logging.INFO)\nif not _audit_logger.handlers:\n    _audit_logger.addHandler(logging.StreamHandler())\n_audit_logger.propagate = False\n\nclass CandidateServing:",1)
stage=P/'stage';stage.mkdir(exist_ok=True);(stage/'candidate_serving.py').write_text(s)
(P/'manifest.json').write_text(json.dumps({'target':str(SOURCE),'before':hashlib.sha256(before.encode()).hexdigest(),'after':hashlib.sha256(s.encode()).hexdigest()},indent=2))
print('Runtime fix and content-free diagnostics staged; live files unchanged.')
