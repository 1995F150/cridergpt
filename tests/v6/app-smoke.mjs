// Full existing application, with every Supabase request intercepted as synthetic data.
// Run against a LOCAL dev/preview server only. No production login or AI call is made.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const url = process.env.CRIDERGPT_PREVIEW_URL || 'http://127.0.0.1:8791';
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use a local preview only.');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{localStorage.setItem('vite-ui-theme','dark');});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let demoCalls=0;
 await page.route('**/*.supabase.co/**',route=>{
  const u=new URL(route.request().url());let body=[];
  if(u.pathname.includes('/demo-chat')&&route.request().method()==='POST'){demoCalls++;body={response:'```python\nitems = ["milk", "eggs"]\n```',model:'fixture-model'};}
  return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'},body:JSON.stringify(body)});
 });
 await page.goto(url+'/chat');await page.getByRole('textbox',{name:'Message',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Write a Python list');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.getByText('fixture-model',{exact:true}).waitFor();assert.equal(demoCalls,1,'one request per submit');
 assert.match(await page.locator('code').first().innerText(),/items = \["milk", "eggs"\]/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'docs/v6/screenshots/app-mobile.png',fullPage:true});
 await page.setViewportSize({width:390,height:460});await page.waitForTimeout(150);
 const input=await page.getByRole('textbox',{name:'Message',exact:true}).boundingBox();assert.ok(input.y+input.height<=460,'composer stays within resized viewport');
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Second message');await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForTimeout(300);assert.equal(demoCalls,2);
 assert.equal(errors.length,0,errors.join('\n'));console.log('Full app smoke passed: demo submit, code render, exact model, no overflow, keyboard-size viewport, second submit, no page errors.');
}finally{await browser.close();}
