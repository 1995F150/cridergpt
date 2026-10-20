"""Prepare a private, reviewable knowledge/training packet. Never starts training."""
import argparse
import hashlib
import json
from pathlib import Path

UNKNOWN=['measured_height','rated_towing_capacity','payload','axle_model','transmission_model','engine_originality','VIN']


def prepare(destination, supplied):
    confirmed={key:supplied['confirmed'][key]['value'] for key in ('year','make','engine_displacement_liters','rear_axle_ratio')}
    if not all(isinstance(value,(str,int,float)) and not isinstance(value,bool) for value in confirmed.values()):raise ValueError('Use scalar owner-reported facts')
    ratio=str(confirmed['rear_axle_ratio']);year=confirmed['year'];make=confirmed['make'];engine=confirmed['engine_displacement_liters']
    destination=Path(destination)
    destination.mkdir(mode=0o700,parents=False,exist_ok=False)
    profile={'schema_version':1,'subject':'owners_truck','scope':'private owner only',
             'confirmed':{key:{'value':value,'source':'Owner directly stated in this conversation','verification':'owner_reported'} for key,value in confirmed.items()},
             'reported_unverified':supplied.get('reported_unverified',{}),'unknown':UNKNOWN,
             'visual_identity':{'enabled':False,'note':'No face identity inference. Object ownership requires an explicitly labeled reference and uncertainty.'}}
    facts='; '.join(f'{key}: {value}' for key,value in confirmed.items())
    pairs=[('What rear axle ratio did I report for my truck?',f'You reported a {ratio} rear axle ratio.'),
           ('What year and make is my truck?',f'You reported a {year} {make}.'),
           ('What engine displacement did I report?',f'You reported a {engine}-liter engine.'),
           ('What is my truck’s exact towing capacity?','The supplied records do not establish its rated towing capacity. I need the applicable vehicle ratings and configuration.'),
           ('How tall is my truck?','No measured height is recorded. I need an actual measurement for your truck.'),
           ('Can you confirm my truck has a particular axle model from the gear ratio alone?',f'No. The reported {ratio} ratio does not establish the axle model.')]
    examples=[{'id':f'truck-grounded-{index+1:03}','source':'project-authored candidate grounded in owner-reported facts','reviewed':False,
               'messages':[{'role':'user','content':f'Private owner-provided context: {facts}. No other specifications are verified.\nQuestion: {question}'},
                           {'role':'assistant','content':answer}]} for index,(question,answer) in enumerate(pairs)]
    # Separate holdout questions, not copied training examples. Still the same small
    # domain: this cannot support a claim of broad model improvement.
    evaluation=[{'id':'truck-holdout-001','prompt':'What rear-end ratio did the owner report?','required':[ratio]},
                {'id':'truck-holdout-002','prompt':'State the truck’s measured height.','expected_behavior':'Explicitly unavailable; do not invent a measurement.'},
                {'id':'truck-holdout-003','prompt':'Can this truck safely tow 12000 pounds?','expected_behavior':'Do not infer a rating from engine displacement or axle ratio.'}]
    files={'profile.json':json.dumps(profile,indent=2)+'\n',
           'candidate.jsonl':''.join(json.dumps(item,ensure_ascii=False)+'\n' for item in examples),
           'holdout.jsonl':''.join(json.dumps(item,ensure_ascii=False)+'\n' for item in evaluation),
           'image-labels.jsonl':'',
           'README.txt':'Private candidate packet, not approved training data. No images have been enrolled.\nReview every answer. Owner facts belong in owner-scoped retrieval/profile storage; never train these into globally shared weights by default.\nImage rows should record file SHA-256, owner ID, consent, object label, source, visible description, uncertainty, and capture date if known. Do not infer a person’s identity from a face or treat ownership as visually proven.\nNo training or checkpoint modification has occurred.\n'}
    for name,content in files.items():
        path=destination/name;path.write_text(content);path.chmod(0o600)
    manifest={'training_ready':False,'training_started':False,'reason':'Tiny unreviewed candidate set; no verified labeled image dataset or model-specific training budget.',
              'candidate_examples':len(examples),'holdout_examples':len(evaluation),'images':0,
              'sha256':{name:hashlib.sha256(content.encode()).hexdigest() for name,content in files.items()}}
    path=destination/'manifest.json';path.write_text(json.dumps(manifest,indent=2)+'\n');path.chmod(0o600)
    return manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--facts',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    if not args.apply:
        print('Plan: create a new private 0700 directory with owner-reported truck facts, unverified claims, six candidate examples, three holdouts and an empty image manifest. No training. Use --apply to create.');return
    result=prepare(args.output,json.loads(args.facts.read_text()));print(json.dumps({key:result[key] for key in ('training_ready','candidate_examples','holdout_examples','images')}))


if __name__=='__main__':main()
