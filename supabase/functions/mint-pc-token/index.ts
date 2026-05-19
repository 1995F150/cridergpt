import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub

    const body = await req.json().catch(() => ({}))
    const label = body.label ? String(body.label).slice(0, 80) : 'PC'

    // Generate 32 random bytes → base64url
    const raw = crypto.getRandomValues(new Uint8Array(32))
    const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error: insErr } = await admin.from('pc_ingest_tokens').insert({
      user_id: userId, token_hash: tokenHash, label,
    })
    if (insErr) return json({ error: insErr.message }, 500)

    const ingestUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pc-ingest`
    return json({ ok: true, token, ingest_url: ingestUrl, label })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
