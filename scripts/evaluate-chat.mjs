// Opt-in live evaluation. Never invoked by npm test; consumes inference resources.
import { writeFile } from 'node:fs/promises';
const key=process.env.CRIDERGPT_EVAL_API_KEY;
if(!key)throw new Error('Set CRIDERGPT_EVAL_API_KEY in this terminal; never commit the key.');
const base=process.env.CRIDERGPT_EVAL_BASE_URL||'https://api.cridergpt.com';const u=new URL(base);
if(u.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(u.hostname))throw new Error('HTTPS required for remote credentials.');
const model=process.env.CRIDERGPT_EVAL_MODEL||'andromeda-3.0-360m-100';
const suite=[
 ['python-list','Write Python code defining a list containing milk, eggs, chicken, and cheese. Use a fenced code block.'],
 ['python-function','Write a Python function add(a, b) returning their sum. Use a fenced code block.'],
 ['javascript','Write a JavaScript function that doubles a number. Use a fenced code block.'],
 ['markdown','Explain RAM using a heading and two bullet points.'],
 ['multiline','Write a Python function with a for loop that returns the sum of a list. Use a fenced code block.'],
 ['json','Return only valid JSON with a numeric field answer equal to 4.'],
 ['long-response','Explain CPU, RAM, storage, and networking in four short paragraphs.'],
 ['multi-turn','What item did I name?',[{role:'user',content:'Remember the item: tractor.'},{role:'assistant',content:'You named tractor.'}]],
 ['identity','What is your name?'],
 ['instruction','Reply with only the number: what is 2 + 2?']
];
const results=[];
for(const [category,message,messages=[]] of suite){
 const start=performance.now();
 try{
  const response=await fetch(new URL('/v1/chat',base),{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[...messages,{role:'user',content:message}]}),signal:AbortSignal.timeout(110000)});
  const text=await response.text();if(text.length>400000)throw new Error('Response exceeds evaluation size limit');
  let body;try{body=JSON.parse(text);}catch{throw new Error('Unreadable response');}
  const structuralCheck=category==='json'?(()=>{try{return JSON.parse(body.response).answer===4;}catch{return false;}})():['python-list','python-function','javascript','multiline'].includes(category)?/```[\w+-]*\n[\s\S]+```/.test(body.response||''):null;
  results.push({category,prompt:message,model_requested:model,model_returned:body.model,status:response.status,latency_ms:Math.round(performance.now()-start),response:body.response,finish_reason:body.finish_reason,incomplete:body.incomplete,generated_tokens:body.generated_tokens,structural_check:structuralCheck,manual_quality_review_required:true});
  if([401,403,429].includes(response.status))break;
 }catch(error){results.push({category,prompt:message,status:'transport_failure',error:error.name,latency_ms:Math.round(performance.now()-start)});}
}
const path=process.env.CRIDERGPT_EVAL_OUTPUT||'/tmp/cridergpt-v6-evaluation.json';await writeFile(path,JSON.stringify({suite:'cridergpt-chat-v6.0.0',date:new Date().toISOString(),model,results,note:'Structural checks do not prove correctness. Generated code was not executed.'},null,2),{mode:0o600});console.log('Evaluation saved:',path);
