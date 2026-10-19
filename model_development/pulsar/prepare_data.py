"""Author a small review-only seed dataset; no logs, private chats or evaluation rows imported."""
import hashlib,json,re
from pathlib import Path
P=Path(__file__).resolve().parent
def fingerprint(messages):return hashlib.sha256(json.dumps(messages,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def prompts(messages):return {re.sub(r'\s+',' ',m['content']).strip().casefold() for m in messages if m['role']=='user'}
def validate(splits,eval_cases):
 seen=set();eval_prompts=set().union(*(prompts(c['messages']) for c in eval_cases))
 for split,rows in splits.items():
  for row in rows:
   turns=row['messages']
   if not turns or turns[-1]['role']!='assistant' or any(m['role']!=('user' if i%2==0 else 'assistant') or not m['content'].strip() for i,m in enumerate(turns)):raise ValueError('Invalid alternating chat example')
   if any(m['role']=='assistant' and m['content'].strip() in {"You're welcome!", "No, I'm not a monkey."} for m in turns):raise ValueError('Known irrelevant reply is not a training target')
   digest=fingerprint(turns)
   if digest in seen:raise ValueError('Duplicate example across splits')
   if prompts(turns)&eval_prompts:raise ValueError('Evaluation contamination')
   seen.add(digest)
 return len(seen)
def build():
 splits={'train':[],'validation':[]};counter=0
 def add(q,a,category,split='train',history=None):
  nonlocal counter;counter+=1
  splits[split].append(dict(id=f'pulsar-seed-{counter:04}',category=category,source='project-authored synthetic reference',reviewed=False,messages=[*(history or []),{'role':'user','content':q},{'role':'assistant','content':a}]))
 for q,a in [('Hi!','Hello! How can I help?'),('Good afternoon.','Good afternoon! What would you like help with?'),('Hello, how is it going?','Hello! I’m ready to help.'),('Can you help me with something?','Yes. What do you need help with?'),('Good evening!','Good evening! How can I help?'),('Who are you?','I’m CriderGPT Pulsar, an experimental assistant in the CriderGPT project.'),('Who created the CriderGPT project?','Jessie Crider created the CriderGPT project.'),('Did you train your own base model from scratch?','This candidate uses a pretrained SmolLM2 base; it was not pretrained from scratch.')]:add(q,a,'conversation')
 for q in ['Tell me the creator’s exact birth date.','Give me 100 verified personal facts about the creator.','What is the creator’s home address?','What is my truck’s exact height without measurements?','What is the serial number of my computer?','What engine repairs did I do yesterday?']:
  add(q,'I don’t have verified information for that. Please provide a reliable source or the relevant details.','uncertainty')
 for q,a in [('What is a Python list?','A Python list is an ordered, mutable collection of values.'),('What is RAM used for?','RAM temporarily holds data and programs the computer is using.'),('What happens to water when it freezes?','Liquid water turns into ice.'),('What is photosynthesis?','Photosynthesis uses light energy to make sugars from water and carbon dioxide.'),('What does a computer processor do?','A processor executes instructions and performs calculations.'),('What does an axle gear ratio describe?','It describes the ratio between driveshaft revolutions and axle revolutions.'),('Does a smaller model automatically give better answers?','No. A smaller model may run faster but can have lower answer quality.'),('Can fine-tuning guarantee every answer is correct?','No. Fine-tuning must be evaluated and cannot guarantee correctness.')]:add(q,a,'knowledge')
 for split,words in [('train',['AMBER','CEDAR','PEARL','SILVER','PINE','MAPLE','WILLOW','BRONZE']),('validation',['JADE','BIRCH'])]:
  for word in words:
   add(f'Output the single word {word}, and nothing else.',word,'exact_format',split)
   add(f'Return only a JSON object with key label and string value {word}.',json.dumps({'label':word},separators=(',',':')),'json',split)
   add(f'Write {word} on the first line and {word.lower()} on the second, without explanation.',word+'\n'+word.lower(),'exact_format',split)
 for split,numbers in [('train',range(10,22)),('validation',range(30,34))]:
  for n in numbers:
   add(f'Calculate {n} plus 3. Reply with just the answer.',str(n+3),'arithmetic',split)
   add(f'Calculate {n} minus 2. Reply with just the answer.',str(n-2),'arithmetic',split)
 for split,foods in [('train',[['bread','rice','beans'],['apples','pears','grapes'],['tea','coffee','water'],['oats','corn','barley']]),('validation',[['carrots','peas','onions']])]:
  for items in foods:add('Write only a Python list containing '+', '.join(items)+'.',repr(items),'python',split)
 for name,expression in [('increment','n + 1'),('double','n * 2'),('square','n * n'),('decrement','n - 1')]:add(f'Write a Python function {name}(n). Return {expression}. Code only.',f'def {name}(n):\n    return {expression}','python')
 for split,labels in [('train',['A17','K42','P68','R25']),('validation',['T83'])]:
  for label in labels:
   history=[{'role':'user','content':f'Remember my reference code is {label}.'},{'role':'assistant','content':f'Your reference code is {label}.'}]
   add('Repeat my reference code.',label,'context',split,history)
 add('Do you know my identity?','I only know information you share in this conversation.','uncertainty','validation')
 return splits
if __name__=='__main__':
 splits=build();cases=json.loads((P/'eval_cases.json').read_text());count=validate(splits,cases)
 for split,rows in splits.items():(P/(split+'.jsonl')).write_text(''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in rows))
 manifest=dict(version='pulsar-seed-v1',reviewed=False,training_ready=False,examples=count,splits={s:len(r) for s,r in splits.items()},categories=sorted({r['category'] for rows in splits.values() for r in rows}),private_logs_used=False,evaluation_rows_imported=False,license_note='Project-authored synthetic examples; project owner must review before training or redistribution.',sha256={s:hashlib.sha256((P/(s+'.jsonl')).read_bytes()).hexdigest() for s in splits},eval_sha256=hashlib.sha256((P/'eval_cases.json').read_bytes()).hexdigest())
 (P/'data-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
