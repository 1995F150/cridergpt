// Explicit live-private UI probe, routed over a Unix socket; no public listener.
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
if(!process.argv.includes('--live'))throw Error('Pass --live to test the installed private voice console.');
const root=os.homedir()+'/cridergpt-voice';const key=fs.readFileSync(root+'/state/operator.key','utf8').trim();
const socketPath=(process.env.XDG_RUNTIME_DIR||'/run/user/'+process.getuid())+'/cridergpt-voice/api.sock';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:420,height:900}});
 await page.route('http://localhost:8791/**',async route=>{
  const request=route.request();const url=new URL(request.url());
  const result=await new Promise((resolve,reject)=>{const req=http.request({socketPath,path:url.pathname+url.search,method:request.method(),headers:request.headers()},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}))});req.on('error',reject);const body=request.postDataBuffer();if(body)req.write(body);req.end()});
  const headers=Object.fromEntries(Object.entries(result.headers).filter(([k,v])=>!['transfer-encoding','connection'].includes(k)&&typeof v==='string'));
  await route.fulfill({status:result.status,headers,body:result.body});
 });
 await page.goto('http://localhost:8791/');await page.fill('#key',key);await page.click('#connect');
 await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('connected'));
 assert.equal(await page.locator('#key').getAttribute('type'),'password');
 assert.equal(await page.locator('#consent').isChecked(),false);
 await page.click('#enroll');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Record or choose audio first'));
 await page.fill('#text','This speech is generated locally on the private server.');await page.click('#speak');
 await page.waitForFunction(()=>document.querySelector('#details').textContent.includes('piper-ljspeech-medium'),null,{timeout:60000});
 assert.equal(await page.locator('#generated').evaluate(e=>e.src.startsWith('blob:')),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const previous=await page.locator('#details').textContent();
 await page.evaluate(()=>{window.fetch=async(path,options={})=>{if(path==='/v1/jobs')return new Response(JSON.stringify({id:'fixture-cancel'}));if(path.endsWith('/cancel'))return new Response(JSON.stringify({status:'cancelled'}));return await new Promise(resolve=>window.releasePoll=()=>resolve(new Response(JSON.stringify({status:'completed',result:{audio:'Zml4dHVyZQ==',mime:'audio/wav',model:'SHOULD_NOT_RENDER'}}))))}});
 await page.click('#speak');await page.waitForFunction(()=>window.releasePoll);await page.click('#cancel');await page.evaluate(()=>window.releasePoll());await page.waitForFunction(()=>document.querySelector('#message').textContent.toLowerCase().includes('cancel'));
 assert.equal(await page.locator('#details').textContent(),previous);

 await page.screenshot({path:'/tmp/cridergpt-private-voice-console.png',fullPage:true});
 console.log('PASS: private voice console connects to real Unix API, keeps key masked/consent unchecked, rejects empty enrollment, generates local speech and fits a mobile viewport. No real microphone or human voice used.');
}finally{await browser.close()}
