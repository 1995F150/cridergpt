// Execute the actual Edge handler with isolated auth/catalog/HTTP adapters.
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['supabase/functions/openai-realtime-token/index.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/^https:\/\/deno.land/},()=>({path:'serve',namespace:'fixture'}));
 b.onResolve({filter:/^https:\/\/esm.sh\/.*supabase/},()=>({path:'auth',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='serve'?'export const serve=fn=>globalThis.voiceHandler=fn;':`export const createClient=()=>({auth:{getUser:async()=>{if(globalThis.authThrows)throw Error('fixture');return{data:{user:globalThis.fixtureUser},error:null}}},from:()=>{globalThis.privateReads++;return{select(){return this},order(){return this},limit:async()=>({data:[{title:'private',content:'DO_NOT_LEAK'}]})}}});`,loader:'js'}));
}}]});
globalThis.Deno={env:{get:()=> 'fixture-secret'}};globalThis.privateReads=0;let requests=0;
globalThis.fetch=async()=>{requests++;return new Response(JSON.stringify({client_secret:{value:'fixture-ephemeral'}}),{status:200})};
await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const request=(authorization)=>new Request('https://fixture.test',{method:'POST',headers:{'Content-Type':'application/json',...(authorization?{Authorization:authorization}:{})},body:'{}'});
assert.equal((await voiceHandler(request())).status,401);assert.equal(requests,0);
globalThis.fixtureUser=null;assert.equal((await voiceHandler(request('Bearer invalid'))).status,401);assert.equal(requests,0);
globalThis.authThrows=true;assert.equal((await voiceHandler(request('Bearer fixture'))).status,401);assert.equal(requests,0);globalThis.authThrows=false;
globalThis.fixtureUser={id:'ordinary',email:'ordinary@example.test',user_metadata:{}};
const response=await voiceHandler(request('Bearer fixture'));assert.equal(response.status,200);assert.equal(requests,1);assert.equal(globalThis.privateReads,0);
assert.equal(JSON.stringify(await response.json()).includes('DO_NOT_LEAK'),false);
console.log('PASS: voice Edge handler denies missing/invalid/failed auth before provider access and keeps private style samples out of ordinary-user calls.');
