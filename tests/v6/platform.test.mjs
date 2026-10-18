import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
function compile(path) {
 const output=buildSync({entryPoints:[path],bundle:true,loader:{'.css':'empty'},jsx:'automatic',write:false,platform:'node',format:'cjs',external:['react','react-dom'],alias:{'@':process.cwd()+'/src'}}).outputFiles[0].text;
 const module={exports:{}};new Function('require','module','exports',output)(createRequire(process.cwd()+'/package.json'),module,module.exports);return module.exports;
}
const {ChatMessage}=compile('src/components/chat/ChatMessage.tsx');
const {pageOptions,messageCursor,mergeMessages}=compile('supabase/functions/_shared/chat-history.ts');
const {withChatDeadline}=compile('src/utils/chatRequest.ts');
const draw=(content,metadata)=>renderToStaticMarkup(React.createElement(ChatMessage,{role:'assistant',content,timestamp:'2026-10-17T00:00:00Z',metadata}));
const samples=[['python','items = ["milk", "eggs", "chicken", "cheese"]'],['python','def add(a, b):\n    return a + b'],['javascript','const add = (a, b) => a + b;'],['typescript','const answer: number = 4;'],['html','<div>Hello</div>'],['css','.hello { color: gold; }'],['sql','SELECT id FROM examples;'],['bash','echo "hello"'],['json','{\n  "answer": 4\n}']];
for (const [language,code] of samples) test(`fenced ${language} preserves code and provides copy controls`,()=>{const html=draw('```'+language+'\n'+code+'\n```');assert.match(html,/Copy code/);assert.match(html,/Line numbers/);assert.ok(html.includes(code.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;')));});
test('all providers render Markdown and unknown model labels honestly',()=>{const html=draw('# Answer\n\n**Bold**\n\n- One\n- Two');assert.match(html,/<h1/);assert.match(html,/<strong>Bold/);assert.match(html,/<ul/);assert.match(html,/Model not recorded/);});
test('HTML and dangerous links cannot execute',()=>{const html=draw('<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n```html\n<script>alert(1)</script>\n```');assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('href="javascript:'));});
test('exact backend model survives rendering; selected label is not substituted',()=>{const html=draw('4',{model:'andromeda-3.0-360m-100',provider:'cridergpt_native',context_trimmed:true,context_history_used:16,context_history_received:60});assert.match(html,/andromeda-3.0-360m-100/);assert.match(html,/experimental/);assert.match(html,/16.*60/);});
test('long outputs and incomplete fences remain readable',()=>{assert.match(draw('```python\n'+('print("hello")\n'.repeat(5000))),/Scrollable code/);});
test('pagination validates bounds and cursors before SQL construction',()=>{assert.equal(pageOptions(new URLSearchParams()).limit,40);for(const p of ['limit=0','limit=101','offset=-1','offset=Infinity'])assert.throws(()=>pageOptions(new URLSearchParams(p)));assert.throws(()=>messageCursor(JSON.stringify({created_at:'now),id.gt.0',id:'bad'})));assert.equal(messageCursor(null),undefined);});
test('pages and realtime events deduplicate and order equal timestamps deterministically',()=>{const a={id:'a',created_at:'2026-01-01',content:'a'},b={id:'b',created_at:'2026-01-01',content:'b'};assert.deepEqual(mergeMessages([b],[a,b]).map(m=>m.id),['a','b']);});
test('deadline gives an actionable error; successful calls and provider errors propagate',async()=>{assert.equal(await withChatDeadline(Promise.resolve('complete'),50),'complete');await assert.rejects(withChatDeadline(new Promise(()=>{}),5),/completion is unknown/);await assert.rejects(withChatDeadline(Promise.reject(new Error('upstream')),50),/upstream/);});
test('ordinary prose mentioning class or imports stays prose',()=>{assert.ok(!draw('class projects are useful.\nImport the document to continue.').includes('Scrollable code'));});
