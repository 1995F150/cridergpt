// Server-side bridge to the Ubuntu-hosted CriderGPT API (api.cridergpt.com).
// The API key never leaves this function. Admin-only while in verification;
// live chat still runs through chat-with-ai until an authenticated probe succeeds.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ALLOWED_PATHS = ['/v1/health', '/v1/me'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.slice(7));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: claims.claims.sub,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Forbidden — admin only' }, 403);

    const base = (Deno.env.get('CRIDERGPT_API_BASE_URL') ?? '').replace(/\/+$/, '');
    const key = Deno.env.get('CRIDERGPT_API_KEY') ?? '';
    if (!base) return json({ error: 'CRIDERGPT_API_BASE_URL not configured' }, 500);

    let body: { path?: string } = {};
    try { body = await req.json(); } catch { /* default */ }
    const path = body.path ?? '/v1/health';
    if (!ALLOWED_PATHS.includes(path)) return json({ error: 'Path not allowed' }, 400);
    if (path !== '/v1/health' && !key) return json({ error: 'CRIDERGPT_API_KEY not configured' }, 500);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${base}${path}`, {
        headers: key ? { Authorization: `Bearer ${key}`, 'X-API-Key': key } : {},
        signal: ctrl.signal,
      });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }
      return json({ ok: res.ok, upstream_status: res.status, path, data });
    } catch (e) {
      const timeout = (e as Error).name === 'AbortError';
      return json(
        { ok: false, error: timeout ? 'CriderGPT API took too long to respond' : 'CriderGPT API unreachable' },
        timeout ? 504 : 503,
      );
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
