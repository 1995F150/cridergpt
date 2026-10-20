import {build} from 'esbuild';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['src/lib/native-voice.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {NativeVoiceTransport,loadVoiceCatalog,splitSpeech}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const id='11111111-1111-4111-8111-111111111111';
const voice={id:'stock',name:'Actual backend name',model:'piper-ljspeech-medium',provider:'local',kind:'stock',available:true};
assert.equal((await loadVoiceCatalog(async()=>({transcription:{available:true},voices:[{...voice,id:'piper:another-installed-voice'}]})))[0].id,'piper:another-installed-voice');
assert.deepEqual(await loadVoiceCatalog(async()=>({transcription:{available:true},voices:[voice,{...voice,id:'unavailable',available:false}, {...voice,id,available:false}]})),[voice]);
await assert.rejects(loadVoiceCatalog(async()=>({voices:[voice],transcription:{available:false}})),/unavailable/);
let requests=[];let operation;
const invoke=async(name,body)=>{
 requests.push({name,body});assert.equal(name,'cridergpt-ubuntu-api');assert.equal(body.action,'native_audio');
 if(body.operation==='catalog')return{voices:[voice],transcription:{available:true}};
 if(['speech','transcribe'].includes(body.operation)){operation=body.operation;return{id,status:'queued'}}
 if(body.operation==='cancel')return{status:'completed'};
 return{status:'completed',result:operation==='transcribe'?{text:'Recognized question',finish_reason:'eos'}:{audio:'UklGRmZpeHR1cmU=',mime:'audio/wav',finish_reason:'completed',cloned:false}};
};
const transport=new NativeVoiceTransport(invoke,0,1000);
assert.equal((await transport.request('speech-to-text',{audio:'Zml4dHVyZQ=='})).text,'Recognized question');
const text='A longer sentence. '.repeat(30);
const speech=await transport.request('text-to-speech',{text,voice:'stock'});
assert.equal(speech.audioParts.length,2);
assert.equal(requests.filter(r=>r.body.operation==='speech').map(r=>r.body.text).join(''),text);
assert.ok(requests.filter(r=>r.body.operation==='speech').every(r=>r.body.voice_id==='stock'));
assert.equal(splitSpeech('x'.repeat(901)).join(''),'x'.repeat(901));
assert.throws(()=>splitSpeech('x'.repeat(2401)),/too long/);
// Late acceptance after hang-up must be cancelled, not polled or played.
let accepted;const late=[];
const cancelled=new NativeVoiceTransport(async(n,b)=>{late.push(b);if(b.operation==='transcribe')return await new Promise(resolve=>accepted=resolve);return{status:'cancelled'}},0,1000);
const pending=cancelled.request('speech-to-text',{audio:'Zg=='});cancelled.cancel();accepted({id});
await assert.rejects(pending,/cancelled/);assert.ok(late.some(r=>r.operation==='cancel'));assert.ok(!late.some(r=>r.operation==='job'));
const interrupted=new NativeVoiceTransport(async(n,b)=>b.operation==='transcribe'?{id}:b.operation==='job'?{status:'timeout'}:{},0,1000);
await assert.rejects(interrupted.request('speech-to-text',{audio:'Zg=='}),/interrupted/);
const incomplete=new NativeVoiceTransport(async(n,b)=>b.operation==='transcribe'?{id}:b.operation==='job'?{status:'completed',result:{text:'partial',finish_reason:'token_limit',incomplete:true}}:{},0,1000);
await assert.rejects(incomplete.request('speech-to-text',{audio:'Zg=='}),/incomplete/);
console.log('PASS: dynamic backend voice catalog, same-API routing, speech chunk preservation, interruption, incomplete STT and late-accept cancellation.');
