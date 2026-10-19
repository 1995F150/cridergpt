"""Versioned synthetic diversity experiment. Never reads test answers or private logs."""
import hashlib
import json
from pathlib import Path
from prepare_data import build, validate
P=Path(__file__).resolve().parent

def build_varied():
    data=build()
    def add(q,a,category):
        n=len(data['train'])
        data['train'].append(dict(id=f'pulsar-varied-{n:04}',category=category,source='project-authored synthetic rule reference',reviewed=False,messages=[{'role':'user','content':q},{'role':'assistant','content':a}]))
    words=['OAK','GLASS','NORTH','SOUTH','EAST','WEST','MIST','CLOUD','BRICK','WOOD','IRON','WHEEL','BOLT','NUT','BEAM','ROOF']
    for i,first in enumerate(words):
        second=words[(i+5)%len(words)]
        for q in [f'Reply with exactly two lines: {first} then {second}.',f'Write {first} on line one and {second} on line two. No explanation.']:
            add(q,first+'\n'+second,'exact_format')
        add(f'Respond using just {first}. Do not add other text.',first,'exact_format')
    for a in range(2,14):
        b=a+4
        for q in [f'What is {a} + {b}? Answer with only the number.',f'Add {a} and {b}. Give only the numeric result.']:
            add(q,str(a+b),'arithmetic')
        add(f'What is {a+20} minus {b}? Only output the number.',str(a+20-b),'arithmetic')
    for key in ['label','status','shade','tool']:
        for value in ['ready','amber','lathe','cedar','idle','ochre','drill','pine']:
            for q in [f'Return only JSON with one key {key} and value {value}.',f'JSON only: an object containing {key} set to the string {value}.']:
                add(q,json.dumps({key:value},separators=(',',':')),'json')
    for topic in ['birth date','birthday','birthplace','home address','phone number','family details']:
        for subject in ['the project creator','Jessie','CriderGPT creator Jessie']:
            add(f'What is {subject}’s {topic}? I have not provided a source.',f'I do not know the {topic}; no verified information was provided.','uncertainty')
    for q in ['Who developed the CriderGPT project?','Who built CriderGPT?','Name the creator of CriderGPT.','Who is Jessie Crider in this project?']:
        add(q,'Jessie Crider created the CriderGPT project.','identity')
    for items in [['wrench','socket','ratchet'],['nut','washer','bolt'],['hammer','chisel','plane'],['cabbage','beet','leek']]:
        add('Give only Python code for a list with the strings '+', '.join(items)+' in that order.',repr(items),'python')
    return data

def main():
    data=build_varied()
    for name in ['eval_cases.json','fresh_cases.json']:
        validate(data,json.loads((P/name).read_text()))
    destination=P/'varied-seed-v2'
    destination.mkdir(exist_ok=False)
    for split,rows in data.items():
        (destination/(split+'.jsonl')).write_text(''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in rows))
    manifest=dict(version='pulsar-varied-v2',reviewed=False,human_review_completed=False,training_ready=False,
                  development_review='Agent reviewed generation rules: static verified references, arithmetic, valid JSON, no evaluation answers consumed. User requested bounded quality development; no production approval.',
                  private_logs_used=False,evaluation_rows_imported=False,examples=sum(map(len,data.values())),
                  splits={s:len(rows) for s,rows in data.items()},
                  sha256={s:hashlib.sha256((destination/(s+'.jsonl')).read_bytes()).hexdigest() for s in data},
                  eval_sha256=hashlib.sha256((P/'eval_cases.json').read_bytes()).hexdigest(),
                  fresh_eval_sha256=hashlib.sha256((P/'fresh_cases.json').read_bytes()).hexdigest(),
                  warning='Templates were broadened after development failure analysis; original nine cases are not a blind evaluation. No original or fresh exact prompts imported.')
    (destination/'data-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
