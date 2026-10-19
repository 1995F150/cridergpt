import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const built = buildSync({ entryPoints: ['supabase/functions/_shared/native-api.ts'], bundle: true, write: false, platform: 'node', format: 'esm' }).outputFiles[0].text;
const api = await import('data:text/javascript;base64,' + Buffer.from(built).toString('base64'));
const config = api.nativeConfig('https://api.example.test/', 'fixture-server-secret');
const model = 'andromeda-3.0-360m-100';
const catalog = [{ id: model, name: 'Andromeda', type: 'text', experimental: true }, { id: 'stable-diffusion-1.5', name: 'Image', type: 'image' }];
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
test('catalog contains native text models only', async () => assert.deepEqual((await api.nativeModels(config, async () => reply({ models: catalog }))).map(m => m.id), [model]));
test('exact selected model, complete history pairs and no fallback', async () => {
  const calls = [];
  const r = await api.startNativeChat(config, 'owner', { model: 'native:' + model, message: 'Next question', conversation_history: [{ role: 'assistant', content: 'orphan' }, { role: 'user', content: 'Old' }, { role: 'assistant', content: 'Answer' }] }, async (url, options) => {
    calls.push(url);assert.equal(options.redirect, 'error');assert.equal(options.headers.Authorization, 'Bearer fixture-server-secret');
    if (url.endsWith('/v1/models')) return reply({ models: catalog });
    const sent = JSON.parse(options.body);assert.equal(sent.model, model);assert.equal(sent.routing, 'auto');assert.deepEqual(sent.messages.map(m => m.content), ['Old', 'Answer', 'Next question']);
    return reply({ model, response: '4', finish_reason: 'eos', request_id: 'fixture', source: 'smollm2_finetune' });
  });assert.equal(r.response, '4');assert.equal(r.model, model);assert.equal(calls.length, 2);assert.ok(!JSON.stringify(r).includes(config.key));
});
test('unsupported model never calls generation', async () => {
  let calls = 0;await assert.rejects(api.startNativeChat(config, 'owner', { model: 'native:missing', message: 'Hi' }, async () => { calls++; return reply({ models: catalog }); }), /unavailable/);assert.equal(calls, 1);
});
test('model identity mismatch is an error', async () => await assert.rejects(api.startNativeChat(config, 'owner', { model, message: 'Hi' }, async url => url.endsWith('models') ? reply({ models: catalog }) : reply({ model: 'llama', response: 'A reply' })), /identity/));
test('grounded fallback and incomplete flags are preserved', async () => {
  const r = await api.startNativeChat(config, 'owner', { model, message: 'Search the web' }, async url => url.endsWith('models') ? reply({ models: catalog }) : reply({ model, response: 'Labeled evidence summary [1]', source: 'deterministic_source_summary', answer_origin: 'deterministic_source_summary', incomplete: false, finish_reason: 'source_summary_complete', model_finish_reason: 'token_limit', sources: [{ id: 1, url: 'https://amd.com/' }] }));
  assert.equal(r.answer_origin, 'deterministic_source_summary');assert.equal(r.model_finish_reason, 'token_limit');assert.equal(r.sources[0].id, 1);
});
test('image token is bound to owner, job, signature and expiry', async () => {
  const token = await api.signImageJob(config.key, 'owner', 'abcdefghijklmnop', 1000);
  assert.equal(await api.verifyImageJob(config.key, 'owner', token, 2000), 'abcdefghijklmnop');
  await assert.rejects(api.verifyImageJob(config.key, 'other', token, 2000), /does not belong/);
  await assert.rejects(api.verifyImageJob('other-key', 'owner', token, 2000), /does not belong/);
  await assert.rejects(api.verifyImageJob(config.key, 'owner', token, 900000), /expired/);
});
test('async image flow uses signed job and returns bounded PNG', async () => {
  const started = await api.startNativeChat(config, 'owner', { model, message: 'Draw a tractor' }, async url => url.endsWith('models') ? reply({ models: catalog }) : reply({ type: 'image_job', model: 'stable-diffusion-1.5', id: 'abcdefghijklmnop', request_id: 'fixture' }, 202));
  assert.equal(started.type, 'image_job');assert.ok(!JSON.stringify(started).includes(config.key));
  const result = await api.pollNativeImage(config, 'owner', started.job_token, async url => { assert.match(url, /\/v1\/images\/jobs\/abcdefghijklmnop$/);return reply({ model: 'stable-diffusion-1.5', status: 'completed', data: [{ b64_json: 'iVBORw0KGgoAAA==' }] }); });
  assert.equal(result.model, 'stable-diffusion-1.5');assert.match(result.image_url, /^data:image\/png;base64,/);
});
test('long inputs rejected rather than truncated and orphan turns removed', () => {
  assert.throws(() => api.nativeMessages('x'.repeat(6001)), /6000/);
  assert.deepEqual(api.nativeMessages('Hi', [{ role: 'system', content: 'secret' }, { role: 'user', content: 'Hi' }]), [{ role: 'user', content: 'Hi' }]);
});
test('HTTP error, interrupted JSON and oversized body fail visibly', async () => {
  await assert.rejects(api.nativeRequest(config, '/v1/chat', {}, async () => reply({ error: { message: 'Selected model failed; no fallback' } }, 503)), /no fallback/);
  await assert.rejects(api.nativeRequest(config, '/v1/chat', {}, async () => new Response('{"truncated"')), /unreadable|interrupted/);
  await assert.rejects(api.nativeRequest(config, '/v1/chat', {}, async () => new Response('x'.repeat(3200001))), /size limit/);
});
test('vision assistance uses same selected checkpoint and preserves helper identity', async () => {
  const r = await api.startNativeChat(config, 'owner', {model:'native:'+model,message:'Describe this image',imageData:'data:image/png;base64,aGVsbG8='},async (url,options)=>{
    if(url.endsWith('/v1/models'))return reply({models:[{...catalog[0],vision_assist_supported:true}]});
    const body=JSON.parse(options.body);assert.equal(body.model,model);assert.equal(body.routing,'text');assert.equal(body.image_base64,'data:image/png;base64,aGVsbG8=');
    return reply({model,response:'Image analyzed with a helper. A square.',vision_assisted:true,vision_helper:'fixture-vision'});
  });assert.equal(r.model,model);assert.equal(r.vision_helper,'fixture-vision');assert.equal(r.vision_assisted,true);
});
test('unconfigured vision fails before generation rather than calling a cloud provider', async()=>{
  let generated=false;await assert.rejects(api.startNativeChat(config,'owner',{model,message:'Describe',imageData:'data:image/png;base64,aGVsbG8='},async url=>{if(url.endsWith('/v1/models'))return reply({models:catalog});generated=true;return reply({});}),/not enabled/);assert.equal(generated,false);
});
test('remote image URLs are rejected', async()=>{
  await assert.rejects(api.startNativeChat(config,'owner',{model,message:'Describe',image_url:'http://127.0.0.1/private'},async()=>reply({models:catalog})),/remote image URLs/);
});
test('image-only upload receives a default question on the same URL', async()=>{
  const paths=[];
  const result=await api.startNativeChat(config,'owner',{model,imageData:'data:image/png;base64,aGVsbG8=',message:''},async(url,options)=>{
    paths.push(new URL(url).pathname);
    if(url.endsWith('models'))return reply({models:[{...catalog[0],vision_assist_supported:true}]});
    assert.equal(JSON.parse(options.body).messages.at(-1).content,'Describe this image.');
    return reply({model,response:'Visible scene',vision_assisted:true});
  });assert.equal(result.model,model);assert.deepEqual(paths,['/v1/models','/v1/chat']);
});
test('empty or conflicting image fields cannot silently become ordinary chat', async()=>{
  const fetcher=async()=>reply({models:[{...catalog[0],vision_assist_supported:true}]});
  for(const fields of [{imageData:''},{imageData:'fixture',image_base64:'different'}]){
    await assert.rejects(api.startNativeChat(config,'owner',{model,message:'Describe',...fields},fetcher),/Upload|one image field/);
  }
});
