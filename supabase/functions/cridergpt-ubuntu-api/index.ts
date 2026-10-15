// Server-side bridge to the Ubuntu-hosted CriderGPT API (api.cridergpt.com).
// The API key never leaves this function. Admin-only while in verification;
// live chat still runs through chat-with-ai until this test path succeeds.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Action = 'health' | 'models' | 'chat';
const TIMEOUTS: Record<Action, number> = { health: 15000, models: 15000, chat: 90000 };

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

    let body: { action?: string; model?: string; message?: string } = {};
    try { body = await req.json(); } catch { /* default */ }
    const action = (body.action ?? 'health') as Action;
    if (!(action in TIMEOUTS)) return json({ error: 'Unknown action' }, 400);
    if (action !== 'health' && !key) return json({ error: 'CRIDERGPT_API_KEY not configured' }, 500);

    let url = `${base}/v1/health`;
    const init: RequestInit = { method: 'GET', headers: {} };
    if (action === 'models') {
      url = `${base}/v1/models`;
      init.headers = { Authorization: `Bearer ${key}` };
    } else if (action === 'chat') {
      const model = typeof body.model === 'string' ? body.model.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!model || model.length > 200) return json({ error: 'model is required' }, 400);
      if (!message || message.length > 8000) return json({ error: 'message is required (max 8000 chars)' }, 400);
      url = `${base}/v1/chat`;
      init.method = 'POST';
      init.headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
      init.body = JSON.stringify({ model, message });
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUTS[action]);
    const started = Date.now();
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      const text = await res.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }
      return json({ ok: res.ok, action, upstream_status: res.status, elapsed_ms: Date.now() - started, data });
    } catch (e) {
      const timeout = (e as Error).name === 'AbortError';
      return json({
        ok: false,
        action,
        upstream_status: timeout ? 504 : 503,
        elapsed_ms: Date.now() - started,
        error: timeout
          ? `CriderGPT API took longer than ${TIMEOUTS[action] / 1000}s to respond`
          : 'CriderGPT API unreachable',
      });
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
