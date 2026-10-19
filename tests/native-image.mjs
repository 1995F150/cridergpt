import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const built=await build({entryPoints:['src/utils/nativeImage.ts'],bundle:true,write:false,format:'iife',globalName:'nativeImage'});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.setContent('<main></main>');await page.addScriptTag({content:built.outputFiles[0].text});
 const result=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=2400;canvas.getContext('2d').fillRect(0,0,3200,2400);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const data=await nativeImage.prepareNativeImage(new File([blob],'phone.png',{type:'image/png'}));
  const image=await createImageBitmap(await (await fetch(data)).blob());const dimensions=[image.width,image.height];image.close();
  const errors=[];
  for(const file of [new File(['text'],'image.svg',{type:'image/svg+xml'}),{type:'image/jpeg',size:21*1024*1024}]){
   try{await nativeImage.prepareNativeImage(file)}catch(e){errors.push(e.message)}
  }
  return {dimensions,prefix:data.slice(0,23),errors};
 });
 assert.deepEqual(result.dimensions,[1536,1152]);assert.equal(result.prefix,'data:image/jpeg;base64,');assert.equal(result.errors.length,2);
 console.log('PASS: real browser image resizing, JPEG encoding, unsupported formats and upload size limits.');
}finally{await browser.close()}
