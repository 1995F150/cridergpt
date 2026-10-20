// Real React hook with microphone/audio/network adapters. No live API or recording.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const fixture=`export const useToast=()=>({toast:()=>{}}); export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},functions:{invoke:async(name,options)=>await new Promise(resolve=>window.requests.push({name,body:options.body,resolve}))}};`;
const result=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{useDIYCallMode}from'./src/hooks/useDIYCallMode';function App(){window.call=useDIYCallMode();return null}createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',plugins:[{name:'fixture',setup(b){b.onResolve({filter:/^@\/(integrations\/supabase\/client|hooks\/use-toast|lib\/native-voice)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@/lib/native-voice'?`export const loadVoiceCatalog=async()=>[{id:'stock',name:'Backend fixture voice',provider:'local',model:'fixture-piper',kind:'stock',available:true}];export class NativeVoiceTransport{constructor(invoke){this.invoke=invoke}request(name,body){return this.invoke(name,body)}cancel(){window.cancelledVoiceTransports=(window.cancelledVoiceTransports||0)+1}}`:fixture,loader:'js'}))}}]});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.route('http://call.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
 await page.goto('http://call.test');
 await page.evaluate(()=>{
  window.requests=[];window.tracks=[];window.recorders=[];window.audios=[];window.clock=1000;window.level=.1;
  Object.defineProperty(performance,'now',{value:()=>window.clock});
  window.requestAnimationFrame=fn=>{window.frame=fn;return 1};window.cancelAnimationFrame=()=>{};
  const media=()=>{const track={enabled:true,stopped:false,stop(){this.stopped=true}};window.tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]}};
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>window.holdMic?await new Promise(resolve=>window.releaseMic=()=>resolve(media())):media()}});
  window.AudioContext=class{createMediaStreamSource(){return{connect(){}}}createAnalyser(){return{fftSize:1024,getFloatTimeDomainData(buffer){buffer.fill(window.level)}}}async resume(){}async close(){}};
  window.MediaRecorder=class{static isTypeSupported(){return true}constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;window.recorders.push(this)}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fixture'])});queueMicrotask(()=>this.onstop?.())}};
  window.Audio=class{constructor(){window.audios.push(this)}play(){return Promise.resolve()}pause(){this.paused=true}};
  localStorage.setItem('crider-gpt-selected-model','native:pulsar-test');
 });
 await page.addScriptTag({content:result.outputFiles[0].text});await page.waitForFunction(()=>window.call?.voices.length===1 && !window.call.voicesLoading);
 const start=async()=>{await page.evaluate(()=>window.call.startCall());await page.waitForFunction(()=>window.call.isCallActive)};
 const utterance=async()=>page.evaluate(()=>{window.level=.1;window.clock+=1000;window.frame();window.level=0;window.clock+=1500;window.frame()});
 const answer=async(name,data)=>{await page.waitForFunction(name=>window.requests.some(r=>r.name===name),name);await page.evaluate(({name,data})=>{const i=window.requests.findIndex(r=>r.name===name);window.requests.splice(i,1)[0].resolve({data,error:null})},{name,data})};
 assert.equal(await page.evaluate(()=>window.call.voice),'stock');
 await start();assert.equal(await page.evaluate(()=>window.call.callModel),'native:pulsar-test');
 await utterance();await page.waitForFunction(()=>window.requests.length===1);
 // Hang up during STT, then resolve: no late caption, chat request or audio.
 await page.evaluate(()=>window.call.endCall());await answer('speech-to-text',{text:'stale'});await page.waitForTimeout(30);
 assert.equal(await page.evaluate(()=>window.call.transcripts.length),0);assert.equal(await page.evaluate(()=>window.requests.length),0);
 assert.equal(await page.evaluate(()=>window.tracks.every(t=>t.stopped)),true);
 await start();await utterance();await answer('speech-to-text',{text:'current question'});
 await page.waitForFunction(()=>window.requests.some(r=>r.name==='chat-with-ai'));
 const body=await page.evaluate(()=>window.requests.find(r=>r.name==='chat-with-ai').body);
 assert.equal(body.model,'native:pulsar-test');assert.deepEqual(body.conversation_history,[]);assert.equal(body.message,'current question');
 await answer('chat-with-ai',{response:'An answer.',model:'pulsar-test',incomplete:false,finish_reason:'eos'});await answer('text-to-speech',{audioContent:'fixture'});
 await page.waitForFunction(()=>window.call.aiSpeaking);
 await page.evaluate(()=>window.call.adjustVolume(.3));assert.equal(await page.evaluate(()=>window.audios.at(-1).volume),.3);
 await page.evaluate(()=>window.call.endCall());assert.equal(await page.evaluate(()=>window.audios.at(-1).paused),true);
 // Mute changes the actual microphone track, not only a UI flag.
 await start();await page.evaluate(()=>window.call.toggleMute());assert.equal(await page.evaluate(()=>window.tracks.at(-1).enabled),false);
 await page.evaluate(()=>window.call.endCall());
 // A recording-device error must close the call and release microphone tracks.
 await start();await page.evaluate(()=>window.recorders.at(-1).onerror());
 assert.equal(await page.evaluate(()=>window.tracks.at(-1).stopped),true);
 await page.waitForFunction(()=>!window.call.isCallActive && window.call.micError.includes('recording failed'));
 // Permission replies after hang-up must release the newly granted stream.
 await page.evaluate(()=>{window.holdMic=true;window.starting=window.call.startCall()});
 await page.waitForFunction(()=>window.releaseMic);await page.evaluate(()=>window.call.endCall());await page.evaluate(()=>window.releaseMic());await page.evaluate(()=>window.starting);
 assert.equal(await page.evaluate(()=>window.tracks.at(-1).stopped),true);assert.equal(await page.evaluate(()=>window.call.isCallActive),false);
 console.log('PASS: real call hook — selected model, late STT rejection, history field, active playback stop, volume, physical mute, late microphone cleanup.');
}finally{await browser.close()}
