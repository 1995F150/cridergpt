import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function authorized(candidate: string, expected: string) {
  if (!expected || candidate.length > 256) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(expected), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode('history-sync'));
  const other = await crypto.subtle.importKey('raw', enc.encode(candidate || 'missing'), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', other, signature, enc.encode('history-sync'));
}
// Dedicated backend-only endpoint. Never put its existing master key in a browser.
// Managed client API keys intentionally do not grant cloud-history export access.
Deno.serve(async req => {
 if (req.method !== 'POST') return reply(405, { error: 'POST required' });
 if (!await authorized(req.headers.get('Authorization')?.replace(/^Bearer /,'') || '', Deno.env.get('CRIDERGPT_HISTORY_SYNC_KEY') || '')) return reply(401, { error: 'Unauthorized' });
 try {
  const raw = await req.text(); if (raw.length > 16000) return reply(413, { error: 'Request too large' });
  const body = JSON.parse(raw);
  if (!body || !Array.isArray(body.user_ids) || body.user_ids.length < 1 || body.user_ids.length > 20 || !body.user_ids.every((id: unknown) => typeof id === 'string' && uuid.test(id))) return reply(400, { error: 'Explicit linked account IDs required' });
  const allowed = new Set((Deno.env.get('CRIDERGPT_HISTORY_SYNC_USER_IDS') || '').split(',').filter(Boolean));
  if (!body.user_ids.every((id: string) => allowed.has(id))) return reply(403,{error:'Account is not approved for replication'});
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
  const {data:enrolled,error:enrollmentError}=await db.from('history_sync_accounts').select('user_id').in('user_id',body.user_ids).eq('enabled',true);
  if(enrollmentError)throw enrollmentError;
  if(new Set((enrolled||[]).map(row=>row.user_id)).size!==new Set(body.user_ids).size)return reply(403,{error:'Account replication is disabled'});
  if (body.action === 'pull') {
   const { data, error } = await db.from('history_sync_outbox').select('event_id,revision,user_id,entity,entity_id,operation,payload,created_at').in('user_id',body.user_ids).is('delivered_at',null).order('revision').limit(30);
   if (error) throw error;
   const events=[]; let bytes=0; for (const event of data || []) { const size=new TextEncoder().encode(JSON.stringify(event)).length; if (bytes+size>6000000) break; events.push(event); bytes+=size; }
   if (data?.length && !events.length) return reply(503,{error:'History event exceeds receiver capacity; inspection required.'});
   return reply(200, { events });
  }
  if (body.action === 'ack') {
   if (!Array.isArray(body.event_ids) || body.event_ids.length > 30 || !body.event_ids.every((id: unknown) => typeof id === 'string' && uuid.test(id))) return reply(400, { error: 'Invalid acknowledgement' });
   const { error } = await db.from('history_sync_outbox').update({delivered_at:new Date().toISOString(),payload:{}}).in('event_id',body.event_ids).in('user_id',body.user_ids).is('delivered_at',null);
   if (error) throw error; return reply(200,{ok:true});
  }
  if (body.action === 'backfill') {
   // Resumable one-table pages, revision zero: live updates/deletes always win.
   const tables = { conversation: 'chat_conversations', message: 'chat_messages', memory: 'ai_memory' };
   if (!Object.prototype.hasOwnProperty.call(tables,body.entity) || (body.after && !uuid.test(body.after))) return reply(400,{error:'Invalid backfill cursor'});
   const columns = { conversation: 'id,user_id,title,created_at,updated_at', message: 'id,user_id,conversation_id,role,content,created_at,metadata,tokens_used,image_url', memory: 'id,user_id,content,details,category,topic,source,created_at,updated_at' };
   let query = db.from(tables[body.entity as keyof typeof tables]).select(columns[body.entity as keyof typeof columns]).in('user_id',body.user_ids).order('id').limit(30);
   if (body.after) query=query.gt('id',body.after);
   const {data,error}=await query;if(error)throw error;
   return reply(200,{events:(data||[]).map(r=>({event_id:`backfill:${body.entity}:${r.id}`,revision:0,user_id:r.user_id,entity:body.entity,entity_id:r.id,operation:'upsert',payload:r,created_at:new Date().toISOString()})),next_after:data?.length===30?data[data.length-1].id:null});
  }
  return reply(400,{error:'Unknown action'});
 } catch { return reply(503,{error:'History sync is unavailable; pending events are retained.'}); }
});
