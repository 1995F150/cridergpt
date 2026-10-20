import { build } from 'esbuild';
import assert from 'node:assert/strict';
const result = await build({entryPoints:['src/lib/call-turn.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {CallTurn} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(overrides={},timeout=1000){
 const requests=[],captions=[],played=[];
 const turn=new CallTurn(async(name,body)=>{requests.push({name,body});return overrides[name] ? await overrides[name](body) : name==='speech-to-text'?{text:'question '+requests.length}:name==='chat-with-ai'?{response:'answer',model:body.model.replace(/^native:/,''),finish_reason:'eos'}:{audioContent:'fixture-audio'}},entry=>captions.push(entry),async audio=>played.push(audio),timeout);
 turn.start();return {turn,requests,captions,played};
}
let checks=0;
{
 const f=fixture();await f.turn.run('bytes','audio/mp4','native:pulsar-candidate','onyx');await f.turn.run('bytes','audio/mp4','native:andromeda','onyx');
 const chat=f.requests.filter(r=>r.name==='chat-with-ai');
 assert.equal(chat[0].body.model,'native:pulsar-candidate');assert.equal(chat[1].body.model,'native:andromeda');
 assert.deepEqual(chat[0].body.conversation_history,[]);
 assert.deepEqual(chat[1].body.conversation_history,[{role:'user',content:'question 1'},{role:'assistant',content:'answer'}]);
 assert.equal('conversationHistory' in chat[1].body,false);assert.equal(f.played.length,2);checks++;
}
{
 const pending=deferred();const f=fixture({'speech-to-text':()=>pending.promise});
 const first=f.turn.run('a','audio/webm','native:a','onyx');
 assert.equal(await f.turn.run('b','audio/webm','native:a','onyx'),false);assert.equal(f.requests.length,1);
 pending.resolve({text:'first'});await first;checks++;
}
{
 const pending=deferred();const f=fixture({'speech-to-text':()=>pending.promise});
 const first=f.turn.run('a','audio/webm','native:a','onyx');f.turn.stop();assert.equal(await first,false);
 pending.resolve({text:'stale'});await tick();assert.equal(f.captions.length,0);assert.equal(f.requests.length,1);checks++;
}
{
 const pending=deferred();const f=fixture({'chat-with-ai':()=>pending.promise});
 const first=f.turn.run('a','audio/webm','native:a','onyx');await tick();f.turn.stop();assert.equal(await first,false);
 pending.resolve({response:'stale'});await tick();assert.equal(f.captions.filter(c=>c.speaker==='ai').length,0);assert.equal(f.played.length,0);checks++;
}
{
 const pending=deferred();const f=fixture({'speech-to-text':()=>pending.promise},10);
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/timed out/);
 pending.resolve({text:'late'});await tick();assert.equal(f.captions.length,0);assert.equal(f.turn.processing,false);checks++;
}
{
 const f=fixture({'chat-with-ai':async()=>({response:'partial',incomplete:true,model:'a'})});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/incomplete/);
 assert.equal(f.captions.at(-1).incomplete,true);assert.equal(f.played.length,0);assert.equal(f.requests.length,2);checks++;
}
{
 let attempts=0;const f=fixture({'speech-to-text':async()=>{if(!attempts++)throw Error('network');return {text:'retry'}}});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'));assert.equal(f.turn.processing,false);
 assert.equal(await f.turn.run('a','audio/webm','native:a','onyx'),true);checks++;
}
{
 const f=fixture({'text-to-speech':async()=>({error:'unavailable'})});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/Speech playback/);
 assert.equal(f.captions.at(-1).text,'answer');checks++;
}
{
 const pending=deferred();let n=0;const f=fixture({'speech-to-text':()=>++n===1?pending.promise:Promise.resolve({text:'new session'})});
 const old=f.turn.run('a','audio/webm','native:a','onyx');f.turn.start();
 assert.equal(await old,false);await f.turn.run('a','audio/webm','native:b','onyx');
 pending.resolve({text:'old session'});await tick();assert.deepEqual(f.requests.find(r=>r.name==='chat-with-ai').body.conversation_history,[]);
 assert.equal(f.captions.some(c=>c.text==='old session'),false);checks++;
}
{
 const f=fixture({'speech-to-text':async()=>({text:'  '})});assert.equal(await f.turn.run('a','audio/webm','native:a','onyx'),false);assert.equal(f.requests.length,1);checks++;
}
{
 const f=fixture({'chat-with-ai':async()=>({response:'wrong checkpoint',model:'wrong'})});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/different model/);
 assert.equal(f.played.length,0);assert.equal(f.captions.filter(c=>c.speaker==='ai').length,0);checks++;
}
{
 const f=fixture({'chat-with-ai':async()=>({response:'Unverified legacy answer',model:'a'})});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/unverified/);
 assert.equal(f.played.length,0);assert.equal(f.captions.at(-1).incomplete,true);checks++;
}
{
 const f=fixture({'chat-with-ai':async()=>({response:'limited',model:'a',finish_reason:'eos',output_limit_reached:true})});
 await assert.rejects(f.turn.run('a','audio/webm','native:a','onyx'),/incomplete/);
 assert.equal(f.played.length,0);checks++;
}
console.log(`PASS: ${checks} call-turn checks (routing, history, overlap, hang-up, timeout, retry, incomplete replies, audio failures, session isolation).`);
