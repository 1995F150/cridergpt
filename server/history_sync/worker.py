"""Single unprivileged pull worker. No incoming port, raw content or secret logs."""
import argparse,json,os,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
from replica import Replica,now,uid
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
class Worker:
 def __init__(self,config,request=None,api_request=None):
  self.config=config;self.links={uid(k):v for k,v in config.get('links',{}).items()};self.api_links={uid(k):v for k,v in config.get('api_links',{}).items()}
  if not self.links and not self.api_links:raise ValueError('Explicit verified account links required; no automatic account merging')
  self.replica=Replica(config['database']);self.request=request or self.http;self.api_request=api_request or self.http_api
 def call(self,url,body,local=False):
  u=urlparse(url)
  if u.username or u.password or u.query or u.fragment:raise ValueError('Invalid sync URL')
  if local:
   if u.scheme!='http' or u.hostname!='127.0.0.1' or u.port!=8772 or u.path!='/internal/history-sync':raise ValueError('Local API export must use the exact loopback endpoint')
  elif u.scheme!='https' or u.hostname!='udpldrrpebdyuiqdtqnq.supabase.co' or u.path!='/functions/v1/history-sync' or u.port not in {None,443}:raise ValueError('Use the intended HTTPS Supabase endpoint')
  key=Path(self.config['key_file']).read_text().strip()
  req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
  with urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect()).open(req,timeout=20) as response:
   raw=response.read(8000001)
   if len(raw)>8000000:raise ValueError('Sync batch too large')
   return json.loads(raw)
 def http(self,body):return self.call(self.config['endpoint'],body)
 def http_api(self,body):return self.call('http://127.0.0.1:8772/internal/history-sync',body,local=True)
 def deliver(self,request,links):
  result=request({'action':'pull','user_ids':list(links)})
  acknowledged=self.replica.apply(result['events'],links)
  if acknowledged:request({'action':'ack','user_ids':list(links),'event_ids':acknowledged})
  return len(acknowledged)
 def poll(self):
  count=0;failures=[]
  for request,links in [(self.request,self.links),(self.api_request,self.api_links)]:
   if not links:continue
   try:count+=self.deliver(request,links)
   except Exception as error:failures.append(type(error).__name__)
  if failures:raise RuntimeError(','.join(failures))
  self.replica.mark('last_success',now());self.replica.mark('last_error','');return count
 def backfill(self):
  for kind in ['conversation','message','memory']:
   cursor=None
   while True:
    page=self.request({'action':'backfill','entity':kind,'after':cursor,'user_ids':list(self.links)})
    self.replica.apply(page['events'],self.links)
    cursor=page.get('next_after')
    if not cursor:break
 def run(self):
  wait=15
  while True:
   try:self.poll();wait=15
   except Exception as error:self.replica.mark('last_error',type(error).__name__);wait=min(300,wait*2)
   time.sleep(wait)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);parser.add_argument('--once',action='store_true');parser.add_argument('--backfill',action='store_true');args=parser.parse_args()
 config=json.loads(Path(args.config).read_text());worker=Worker(config)
 if args.backfill:worker.backfill()
 if args.once:print(json.dumps({'events_acknowledged':worker.poll()}))
 else:worker.run()
if __name__=='__main__':main()
