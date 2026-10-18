import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ConversationReplay } from '@/components/chat/ConversationReplay';
import { useChat } from '@/hooks/useChat';

const testGlobal = globalThis as typeof globalThis & { fixtureUser: { id: string } | null; calls: string[] };
testGlobal.fixtureUser = { id: 'fixture-owner' }; testGlobal.calls = [];
const date = '2026-10-17T12:00:00Z';
const code = '```python\nitems = ["milk", "eggs", "chicken", "cheese"]\n\ndef add(a, b):\n    return a + b\n\n# '+ 'long line '.repeat(50)+'\n```';
const sample = { id: 'reply', conversation_id: 'B', role: 'assistant' as const, content: code, created_at: date, metadata: { model: 'andromeda-3.0-360m-100', provider: 'cridergpt_native', experimental: true } };
window.fetch = async (input) => {
 const url = new URL(String(input)); testGlobal.calls.push(url.href);
 const action = url.searchParams.get('action');
 let data: object = {};
 if (action === 'conversations') data = { conversations: ['A','B'].map(id => ({ id, title: `Conversation ${id}`, updated_at: date })), next_offset: null };
 if (action === 'messages') {
  const id = url.searchParams.get('conversation_id');
  await new Promise(resolve => setTimeout(resolve, id === 'A' ? 120 : 10));
  data = { messages: [{ ...sample, id: id + (url.searchParams.has('before') ? '-old' : '-new'), conversation_id: id, content: id + (url.searchParams.has('before') ? ' older persisted message' : ' latest persisted message'), created_at: url.searchParams.has('before') ? '2026-10-16T12:00:00Z' : date }], next_before: url.searchParams.has('before') ? null : { id: 'old', created_at: date } };
 }
 return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
export function App() {
 const chat = useChat(); const [replay, setReplay] = useState(false); const [,refresh] = useState(0);
 return <div className="min-h-screen bg-background p-3 text-foreground sm:p-8"><header className="mb-5 border-b border-primary/30 pb-4"><h1 className="text-xl font-semibold text-primary">CriderGPT v6.0.0</h1><p className="text-sm text-muted-foreground">Component validation preview · synthetic conversation</p></header>
 <div className="mx-auto max-w-3xl min-w-0"><ChatMessage role="user" content="Write a Python shopping list and an add function." timestamp={date}/><ChatMessage role="assistant" content={'# Python example\n\n**Preserved formatting**, copied as plain text.\n\n'+code+'\n\n<img src=x onerror="window.__xss=true"> [unsafe](javascript:alert(1))'} timestamp={date} metadata={sample.metadata}/>
 <button className="min-h-11 rounded border p-2" onClick={()=>setReplay(true)}>Replay saved sample</button>
 {replay && <ConversationReplay messages={[{...sample,id:'question',role:'user',content:'Write a Python list.'},sample]} hasOlder={false} loading={false} onLoadOlder={()=>{}} onClose={()=>setReplay(false)}/>}
 <section aria-label="History hook validation" className="mt-5 space-y-2 rounded border p-3"><h2>Account-scoped history validation</h2><div className="flex flex-wrap gap-2">{['A','B'].map(id=><button className="min-h-11 rounded border p-2" key={id} onClick={()=>chat.setCurrentConversation(id)}>Select {id}</button>)}<button className="min-h-11 rounded border p-2" onClick={()=>chat.loadOlderMessages()}>Older page</button><button className="min-h-11 rounded border p-2" onClick={()=>{testGlobal.fixtureUser=null;refresh(x=>x+1);}}>Sign out fixture</button></div><output data-testid="history">{chat.messages.map(m=>m.content).join('\n')}</output><p data-testid="loading">{chat.isLoadingMessages?'Loading':'Idle'}</p></section>
 </div></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
