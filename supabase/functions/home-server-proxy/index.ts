// Home Server Proxy — admins call this to reach the home VM/server
// over the permanent Cloudflare Tunnel (vm.cridergpt.com).
//
// Actions:
//   - status : ping the tunnel + return basic health
//   - command: run a whitelisted command on the server (requires HOME_SERVER_AGENT_URL)
//   - vm-url : return the embeddable noVNC URL
//
// Auth: requires a logged-in admin (checked via has_role RPC).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VM_URL = 'https://vm.cridergpt.com';
const AGENT_URL = Deno.env.get('HOME_SERVER_AGENT_URL') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const userId = claims.claims.sub as string;
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Forbidden — admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'status');

    if (action === 'vm-url') {
      return json({ vm_url: VM_URL, embed_url: VM_URL });
    }

    if (action === 'status') {
      const t0 = Date.now();
      let online = false;
      let httpStatus = 0;
      let error: string | null = null;
      try {
        const res = await fetch(VM_URL, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        httpStatus = res.status;
        online = res.status > 0 && res.status < 500;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      return json({
        online,
        http_status: httpStatus,
        latency_ms: Date.now() - t0,
        vm_url: VM_URL,
        agent_configured: !!AGENT_URL,
        error,
        checked_at: new Date().toISOString(),
      });
    }

    if (action === 'command') {
      if (!AGENT_URL) {
        return json(
          {
            error:
              'HOME_SERVER_AGENT_URL secret not set. Add it to enable command execution.',
          },
          400,
        );
      }
      const command = String(body.command ?? '').trim();
      if (!command) return json({ error: 'command is required' }, 400);

      const t0 = Date.now();
      try {
        const res = await fetch(AGENT_URL.replace(/\/$/, '') + '/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command }),
          signal: AbortSignal.timeout(30000),
        });
        const text = await res.text();
        return json({
          status: res.status,
          ok: res.ok,
          latency_ms: Date.now() - t0,
          output: text,
        });
      } catch (e) {
        return json(
          {
            error: e instanceof Error ? e.message : String(e),
            latency_ms: Date.now() - t0,
          },
          502,
        );
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
