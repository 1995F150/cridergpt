import test from 'node:test';import assert from 'node:assert/strict';import { buildSync } from 'esbuild';import { createRequire } from 'node:module';
const compile = async path => {
  const code = (await import('esbuild')).build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{ name: 'edge-fixtures', setup(build) {
    build.onResolve({ filter: /^(https:|npm:)/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.includes('/cors') ? 'export const corsHeaders={};' : args.path.includes('/http/server') ? 'export const serve=(handler)=>globalThis.__edgeHandler=handler;' : args.path.includes('supabase') ? 'export const createClient=()=>globalThis.__testSupabase;' : '', loader: 'js' }));
  } }] });
  const output = (await code).outputFiles[0].text; const module = { exports: {} };
  new Function('require','module','exports',output)(createRequire(import.meta.url),module,module.exports);
  return globalThis.__edgeHandler;
};
const values = { CRIDERGPT_API_BASE_URL: 'https://api.example.test', CRIDERGPT_API_KEY: 'fixture-secret', SUPABASE_URL: 'https://project.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', SUPABASE_ANON_KEY: 'fixture-anon' };
globalThis.Deno = { env: { get: key => values[key] }, serve: handler => globalThis.__edgeHandler = handler };
const chat = await compile('supabase/functions/chat-with-ai/index.ts');
const bridge = await compile('supabase/functions/cridergpt-ubuntu-api/index.ts');
const operations = await compile('supabase/functions/chat-operations/index.ts');
const model = 'andromeda-3.0-360m-100';
function mockDB({ user = true, admin = false, kill = false } = {}) {
  const calls=[];globalThis.__testSupabase = {
    auth: { getUser: async()=>({data:{user:user?{id:'owner'}:null},error:user?null:new Error('bad')}), getClaims:async()=>({data:{claims:user?{sub:'owner'}:null},error:user?null:new Error('bad')}) },
    rpc: async()=>({data:admin}), from(table) {
      calls.push(table);const result = () => ({data:table==='ai_infrastructure_settings'?{kill_switch:kill}:table==='ai_usage'?{id:'usage',tokens_used:0,user_plan:'free',last_reset:new Date().toISOString()}:null,count:1,error:null});
      const query={then(resolve){resolve(result())},maybeSingle:async()=>result()};
      for(const method of ['select','order','limit','eq','gte','update','insert'])query[method]=()=>query;
      return query;
    }
  };return calls;
}
const request = body => new Request('https://edge.example.test', { method:'POST',headers:{Authorization:'Bearer fixture-user-token','Content-Type':'application/json'},body:JSON.stringify(body) });
test('native authenticated route works without Lovable key and bypasses corpus/cloud', async()=>{
  const tables=mockDB();const urls=[];globalThis.fetch=async url=>{urls.push(url);return new Response(JSON.stringify(url.endsWith('/v1/models')?{models:[{id:model,name:'Andromeda',type:'text'}]}:{model,response:'4',finish_reason:'eos'}));};
  const response=await chat(request({model:'native:'+model,message:'2 + 2'}));const body=await response.json();assert.equal(response.status,200);assert.equal(body.response,'4');assert.ok(!tables.includes('writing_samples'));assert.ok(!tables.includes('training_inputs'));assert.ok(urls.every(url=>url.startsWith(values.CRIDERGPT_API_BASE_URL)));
});
test('native unauthenticated user cannot trigger inference', async()=>{
  mockDB({user:false});globalThis.fetch=()=>{throw Error('must not call upstream')};const response=await chat(request({model:'native:'+model,message:'Hello'}));assert.equal(response.status,401);
});
test('kill switch applies to native route', async()=>{
  mockDB({kill:true});globalThis.fetch=()=>{throw Error('must not call upstream')};assert.equal((await chat(request({model:'native:'+model,message:'Hello'}))).status,503);
});
test('normal signed-in users can list native models but cannot use admin test action', async()=>{
  mockDB();globalThis.fetch=async()=>new Response(JSON.stringify({models:[{id:model,name:'Andromeda',type:'text'}]}));assert.equal((await bridge(request({action:'public_models'}))).status,200);assert.equal((await bridge(request({action:'health'}))).status,403);
});
test('image job ownership rejects another account token before any upstream request', async()=>{
  mockDB();globalThis.fetch=()=>{throw Error('must not call upstream')};assert.equal((await bridge(request({action:'native_image_job',job_token:'invalid.signature'}))).status,403);
});

const messageID='b30bf937-57a4-4891-831b-c0cfd810e56b';
function messageDB({owned=true,duplicate=false,conflict=false}={}){
 let inserted;const filters=[];globalThis.__testSupabase={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from(table){const query={select(){return query},eq(key,value){filters.push([table,key,value]);return query},insert(value){inserted=value;return query},single:async()=>table==='chat_conversations'?{data:owned?{id:'conversation'}:null,error:null}:{data:duplicate?null:inserted,error:duplicate?{code:'23505'}:null},maybeSingle:async()=>({data:{...inserted,content:conflict?'other':inserted.content},error:null})};return query}};return {filters,get inserted(){return inserted}};
}
const saveRequest=()=>new Request('https://edge.example.test?action=send_message',{method:'POST',headers:{Authorization:'Bearer fixture-token','Content-Type':'application/json'},body:JSON.stringify({conversation_id:'conversation',role:'assistant',content:'4',client_message_id:messageID,metadata:{provider:'cridergpt_native',model,finish_reason:'eos'}})});
test('history saves exact model metadata with an idempotent message ID',async()=>{const db=messageDB();const response=await operations(saveRequest());assert.equal(response.status,200);const {message}=await response.json();assert.equal(message.id,messageID);assert.equal(message.metadata.model,model);assert.equal(message.user_id,'owner');assert.ok(db.filters.some(([table,key,value])=>table==='chat_conversations'&&key==='user_id'&&value==='owner'));});
test('history retry deduplicates only the same account conversation and content',async()=>{let db=messageDB({duplicate:true});let response=await operations(saveRequest());assert.equal((await response.json()).deduplicated,true);assert.ok(db.filters.some(([table,key,value])=>table==='chat_messages'&&key==='user_id'&&value==='owner'));messageDB({duplicate:true,conflict:true});assert.equal((await operations(saveRequest())).status,409);});
test('history rejects writes to another users conversation before insertion',async()=>{const db=messageDB({owned:false});assert.equal((await operations(saveRequest())).status,404);assert.equal(db.inserted,undefined);});
