"""Assistant-only token preparation; no optimizer, exports or training run.

Rights/quality eligibility is checked separately by dataset.audit. This function
also supports length audits of unapproved candidates without training on them.
"""
import json
from server.planning.core import messages,validate_response

def encode_candidate(row,tokenizer,max_length):
    if type(max_length) is not int or not 1<=max_length<=8192:raise ValueError('Invalid context budget')
    if validate_response(json.dumps(row['plan']),'eos',row['request'])['status']!='validated':raise ValueError('Invalid training target')
    turns=messages(row['request']);answer=json.dumps(row['plan'],separators=(',',':'),ensure_ascii=False)
    # Transformers versions differ in their default chat-template return type.
    # Always request a dictionary and explicitly extract token IDs.
    prefix=tokenizer.apply_chat_template(turns,tokenize=True,add_generation_prompt=True,return_dict=True)['input_ids']
    full=tokenizer.apply_chat_template([*turns,{'role':'assistant','content':answer}],tokenize=True,return_dict=True)['input_ids']
    if full[:len(prefix)]!=prefix:raise ValueError('Assistant token boundary mismatch; do not silently mask incorrect tokens')
    if len(full)>max_length:raise ValueError('Example exceeds context; no truncation')
    target=full[len(prefix):]
    if not target or tokenizer.eos_token_id not in target:raise ValueError('Assistant EOS missing')
    return {'input_ids':full,'attention_mask':[1]*len(full),'labels':[-100]*len(prefix)+target}
