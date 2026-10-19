// Bundle the real hook with isolated account/transport adapters; no live services.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const stub = `
const user = {id:'fixture'}; const toast = () => {};
export const useAuth = () => ({user}); export const useToast = () => ({toast});
export const supabase = {auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},
channel:()=>({on(...args){if(args[1]?.table==='chat_messages')window.realtime=args.at(-1);return this},subscribe(){return this}}),removeChannel:()=>{}};
`;
const result = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {useChat} from '${process.env.CHAT_HOOK ?? './src/hooks/useChat'}'; function App(){window.chat=useChat();return null} createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}'},plugins:[{name:'isolated',setup(b){b.onResolve({filter:/^@\/(integrations\/supabase\/client|contexts\/AuthContext|hooks\/use-toast)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:stub,loader:'js'}));}}]});
const browser = await chromium.launch({headless:true});
try {
const page = await browser.newPage();
await page.setContent('<div id="root"></div>');
await page.evaluate(()=>{
 window.pending=[];
 if (!crypto.randomUUID) crypto.randomUUID=()=> '00000000-0000-4000-a000-000000000000';
 window.fetch=async(url,options)=>{
  if(url.includes('action=conversations'))return {ok:true,json:async()=>({conversations:[]})};
  return await new Promise(resolve=>window.pending.push({url,body:options.body && JSON.parse(options.body),resolve:data=>resolve({ok:true,json:async()=>data})}));
 };
});
await page.addScriptTag({content:result.outputFiles[0].text});
await page.waitForFunction(()=>window.chat);
const select=async id=>{await page.evaluate(id=>window.chat.setCurrentConversation(id),id);await page.waitForFunction(id=>window.pending.some(p=>p.url.includes('conversation_id='+id)),id)};
const resolveHistory=async(id,content)=>page.evaluate(({id,content})=>{const i=window.pending.findIndex(p=>p.url.includes('conversation_id='+id));window.pending.splice(i,1)[0].resolve({messages:[{id:content,conversation_id:id,role:'assistant',content}]})},{id,content});
await select('A');await select('B');await resolveHistory('B','B reply');await resolveHistory('A','A stale');
await page.waitForFunction(()=>window.chat.messages.length===1);
assert.deepEqual(await page.evaluate(()=>window.chat.messages.map(m=>m.content)),['B reply']);
// Save started in B, completed after selecting C: must persist but not render in C.
await page.evaluate(()=>{window.saving=window.chat.sendMessage('B','late B','assistant')});
await page.waitForFunction(()=>window.pending.some(p=>p.body));
await select('C');await resolveHistory('C','C reply');
await page.evaluate(()=>window.pending.find(p=>p.body).resolve({message:{id:'late',conversation_id:'B',content:'late B',role:'assistant'}}));
await page.evaluate(()=>window.saving);
assert.deepEqual(await page.evaluate(()=>window.chat.messages.map(m=>m.content)),['C reply']);
// Older request for the same chat after A -> B -> A cannot overwrite latest A.
await select('A');await select('B');await select('A');
await resolveHistory('A','old A');await resolveHistory('A','new A');
await page.waitForFunction(()=>window.chat.messages.some(m=>m.content==='new A'));
assert.deepEqual(await page.evaluate(()=>window.chat.messages.map(m=>m.content)),['new A']);
// Realtime duplicate + a history snapshot arriving after a new insert.
await select('D');
await page.evaluate(()=>{const row={id:'D live',conversation_id:'D',content:'D live',role:'assistant'};window.realtime({new:row});window.realtime({new:row})});
await resolveHistory('D','D older');
await page.waitForFunction(()=>window.chat.messages.length===2);
assert.deepEqual(await page.evaluate(()=>window.chat.messages.map(m=>m.content)),['D older','D live']);
// A server response for a different conversation must not be saved in UI state.
await page.evaluate(()=>{window.saving=window.chat.sendMessage('D','question')});
await page.waitForFunction(()=>window.pending.some(p=>p.body?.conversation_id==='D'));
await page.evaluate(()=>window.pending.find(p=>p.body?.conversation_id==='D').resolve({message:{id:'wrong',conversation_id:'other',content:'wrong',role:'user'}}));
assert.equal(await page.evaluate(()=>window.saving),null);
assert.equal(await page.evaluate(()=>window.chat.messages.some(m=>m.id==='wrong')),false);
console.log('PASS: late history, late saves, and A → B → A routing (real React hook).');
} finally {await browser.close()}
