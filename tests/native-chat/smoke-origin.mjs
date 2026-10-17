// Explicit opt-in real local-origin probe; does not sign in as a website user.
import {readFile,writeFile} from 'node:fs/promises';import {buildSync} from 'esbuild';import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const output=buildSync({entryPoints:['supabase/functions/_shared/native-api.ts'],bundle:true,write:false,platform:'node',format:'esm'}).outputFiles[0].text;
const api=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const key=(await readFile('/home/cridergpt2026/cridergpt-chat-api/private/api-key','utf8')).trim();const config=api.nativeConfig('https://api.cridergpt.com',key);
const fetcher=(url,options)=>fetch('http://127.0.0.1:8772'+new URL(url).pathname,options);
const models=await api.nativeModels(config,fetcher);const results=[];
for(const model of models){const start=Date.now();try{const r=await api.startNativeChat(config,'isolated-origin-test',{model:'native:'+model.id,message:model.id.includes('andromeda')?'What is 2 + 2?':'Hi'},fetcher);results.push({model:model.id,response:r.response,finish_reason:r.finish_reason??'not_recorded',elapsed_ms:Date.now()-start});}catch(error){results.push({model:model.id,error:error.message,elapsed_ms:Date.now()-start});}}
console.log(JSON.stringify(results,null,2));
await writeFile('/home/cridergpt2026/cridergpt-public-chat-deployment-backup/origin-tests.json',JSON.stringify(results,null,2));
