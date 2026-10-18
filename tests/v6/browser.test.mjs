// Browser tests use synthetic data and no production session or inference requests.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixtureModules = {
 '@/integrations/supabase/client': `const ch={on(){return ch},subscribe(){return ch}};export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'synthetic-session'}}})},channel:()=>ch,removeChannel:()=>{}};`,
 '@/contexts/AuthContext': `export const useAuth=()=>({user:globalThis.fixtureUser});`,
 '@/hooks/use-toast': `const toast=()=>{};export const useToast=()=>({toast});`
};
const bundle=await build({entryPoints:['tests/v6/browser-fixture.tsx'],bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}'},jsx:'automatic',alias:{'@':process.cwd()+'/src'},plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/^@\/(integrations\/supabase\/client|contexts\/AuthContext|hooks\/use-toast)$/},args=>({path:args.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:fixtureModules[args.path],loader:'js'}));}}],outdir:'/tmp/crider-v6-fixture'});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;const css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'';
const productionCssFiles=(await readdir('dist/assets')).filter(name=>name.endsWith('.css'));const productionCSS=(await Promise.all(productionCssFiles.map(name=>readFile('dist/assets/'+name,'utf8')))).join('\n');
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'application/javascript':req.url==='/fixture.css'?'text/css':'text/html');res.end(req.url==='/fixture.js'?js:req.url==='/fixture.css'?productionCSS+'\n'+css:'<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
await mkdir('docs/v6/screenshots',{recursive:true});let count=0;
try{
 for(const [name,engine,width,height] of [['iphone',webkit,390,844],['android',chromium,412,915],['desktop',chromium,1280,900]]){
  let browser;let actualEngine=engine;try{browser=await engine.launch({headless:true});}catch(error){if(engine===webkit){console.log('WebKit unavailable; iPhone dimensions tested in Chromium, not Safari.');actualEngine=chromium;browser=await chromium.launch({headless:true});}else throw error;}
  try{
   const context=await browser.newContext({viewport:{width,height},...(actualEngine===chromium?{permissions:['clipboard-read','clipboard-write']}: {})});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.locator('code .hljs-keyword').first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page must not overflow');
   assert.equal(await page.evaluate(()=>Boolean(window.__xss)),false);assert.equal(await page.locator('a[href^="javascript:"]').count(),0);count+=3;
   await page.getByRole('button',{name:'Line numbers'}).first().click();assert.equal(await page.getByRole('button',{name:'Line numbers'}).first().getAttribute('aria-pressed'),'true');count++;
   if(actualEngine===chromium){await page.getByRole('button',{name:'Copy code',exact:true}).first().click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/    return a \+ b/);count++;}
   await page.screenshot({path:`docs/v6/screenshots/${name}.png`,fullPage:true});
   await page.getByRole('button',{name:'Replay saved sample'}).click();const replay=page.getByRole('region',{name:'Conversation replay'});await replay.getByRole('button',{name:'Next',exact:true}).click();assert.match(await replay.innerText(),/1 \/ 2/);await replay.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(1700);assert.match(await replay.innerText(),/2 \/ 2/);await replay.getByRole('button',{name:'Back to chat'}).click();count++;
   await page.getByRole('button',{name:'Select A',exact:true}).click();await page.waitForTimeout(20);await page.getByRole('button',{name:'Select B',exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.getByTestId('history').innerText(),'B latest persisted message');count++;
   await page.getByRole('button',{name:'Older page'}).click();await page.waitForTimeout(100);assert.match(await page.getByTestId('history').innerText(),/B older persisted message\s+B latest persisted message/);count++;
   await page.reload();await page.getByTestId('history').filter({hasText:'B latest persisted message'}).waitFor();count++;
   await page.getByRole('button',{name:'Sign out fixture'}).click();await page.waitForTimeout(100);assert.equal(await page.getByTestId('history').innerText(),'');assert.equal(errors.length,0,errors.join('\n'));count+=2;
   console.log(name,'browser validations passed');
  }finally{await browser.close();}
 }
 console.log(count,'browser assertions passed');
}finally{server.close();}
