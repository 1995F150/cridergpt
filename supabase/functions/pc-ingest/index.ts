import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Public endpoint (no JWT) - auth happens via X-PC-Token header
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pc-token',
      },
    })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const token = req.headers.get('x-pc-token')
    if (!token || token.length < 16) return json({ error: 'missing token' }, 401)

    // Hash the presented token (SHA-256 hex)
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tok, error: tokErr } = await admin
      .from('pc_ingest_tokens')
      .select('id, user_id, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (tokErr || !tok || tok.revoked_at) return json({ error: 'invalid token' }, 401)

    // GET = poll outbox (backend → PC commands)
    if (req.method === 'GET') {
      const { data: pending } = await admin
        .from('pc_outbox')
        .select('id, command, payload, created_at')
        .eq('user_id', tok.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20)

      await admin.from('pc_ingest_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tok.id)
      return json({ ok: true, commands: pending ?? [] })
    }

    // POST = push an event up
    const body = await req.json().catch(() => ({}))
    const eventType = String(body.event_type ?? 'log').slice(0, 64)
    const sourceLabel = body.source_label ? String(body.source_label).slice(0, 128) : null
    const payload = body.payload ?? {}

    // ack delivered outbox items if PC reports them
    if (Array.isArray(body.ack) && body.ack.length > 0) {
      await admin
        .from('pc_outbox')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .in('id', body.ack.filter((x: unknown) => typeof x === 'string'))
        .eq('user_id', tok.user_id)
    }

    const { error: insErr } = await admin.from('pc_events').insert({
      user_id: tok.user_id,
      event_type: eventType,
      source_label: sourceLabel,
      payload,
    })
    if (insErr) return json({ error: insErr.message }, 500)

    await admin.from('pc_ingest_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tok.id)
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
