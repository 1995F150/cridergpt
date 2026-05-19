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
const ENV_AGENT_URL = Deno.env.get('HOME_SERVER_AGENT_URL') ?? '';
const ENV_AGENT_TOKEN = Deno.env.get('HOME_SERVER_AGENT_TOKEN') ?? '';

async function agentCall(
  path: string,
  body: unknown,
  agentUrl: string,
  agentToken: string,
  timeoutMs = 30000,
) {
  if (!agentUrl) return { status: 0, ok: false, error: 'No PC linked. Run start-pc-remote.cmd to link.', configured: false };
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (agentToken) headers['Authorization'] = `Bearer ${agentToken}`;
    const res = await fetch(agentUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.status, ok: res.ok, latency_ms: Date.now() - t0, data: parsed };
  } catch (e) {
    return { status: 0, ok: false, error: e instanceof Error ? e.message : String(e), latency_ms: Date.now() - t0 };
  }
}

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

    // Per-user PC link (preferred) → fallback to project env secrets
    let AGENT_URL = ENV_AGENT_URL;
    let AGENT_TOKEN = ENV_AGENT_TOKEN;
    const { data: link } = await supabase
      .from('pc_links')
      .select('agent_url, agent_token')
      .eq('user_id', userId)
      .maybeSingle();
    if (link?.agent_url && link?.agent_token) {
      AGENT_URL = link.agent_url;
      AGENT_TOKEN = link.agent_token;
    }

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
        const res = await fetch(VM_URL, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        httpStatus = res.status;
        online = res.status > 0 && res.status < 500;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      return json({
        online, http_status: httpStatus, latency_ms: Date.now() - t0,
        vm_url: VM_URL, agent_configured: !!AGENT_URL,
        agent_source: link?.agent_url ? 'user_link' : (ENV_AGENT_URL ? 'env' : 'none'),
        error, checked_at: new Date().toISOString(),
      });
    }

    if (action === 'youtube') {
      const url = String(body.url ?? '').trim();
      if (!/^https?:\/\//i.test(url)) return json({ error: 'valid url required' }, 400);
      const format = String(body.format ?? 'mp4');
      const quality = String(body.quality ?? 'best');
      const subtitles = !!body.subtitles;
      const thumbnail = !!body.thumbnail;
      const playlist = !!body.playlist;
      const startTime = String(body.startTime ?? '').trim();
      const endTime = String(body.endTime ?? '').trim();
      const outDir = '~/Downloads/cridergpt-yt';
      const safeUrl = url.replace(/'/g, "'\\''");
      const parts: string[] = [`mkdir -p ${outDir}`, '&&', 'yt-dlp'];
      if (!playlist) parts.push('--no-playlist');
      if (subtitles) parts.push('--write-subs --sub-langs en --embed-subs');
      if (thumbnail) parts.push('--embed-thumbnail');
      if (startTime || endTime) {
        const range = `*${startTime || '0'}-${endTime || 'inf'}`;
        parts.push(`--download-sections "${range}"`);
      }
      if (format === 'mp3') {
        const abr = /^\d+k$/.test(quality) ? quality : '192k';
        parts.push(`-x --audio-format mp3 --audio-quality ${abr}`);
      } else {
        const heightFilter = /^\d+$/.test(quality) ? `[height<=${quality}]` : '';
        parts.push(`-f "bv*${heightFilter}+ba/b${heightFilter}" --merge-output-format mp4`);
      }
      parts.push(`-o "${outDir}/%(title).100s [%(id)s].%(ext)s"`);
      parts.push(`'${safeUrl}'`);
      const ytCmd = parts.join(' ');
      if (!AGENT_URL) return json({ command: ytCmd, error: 'No PC linked — copy this command and run it on the server.' }, 200);
      const r = await agentCall('/run', { command: ytCmd, timeout: 600 }, AGENT_URL, AGENT_TOKEN, 600000);
      return json({ command: ytCmd, ...r });
    }

    if (action === 'command') {
      const command = String(body.command ?? '').trim();
      if (!command) return json({ error: 'command is required' }, 400);
      const r = await agentCall('/run', { command, timeout: body.timeout ?? 60 }, AGENT_URL, AGENT_TOKEN);
      return json(r);
    }

    if (action === 'pc-screenshot') return json(await agentCall('/screenshot', {}, AGENT_URL, AGENT_TOKEN, 15000));
    if (action === 'pc-click')      return json(await agentCall('/click',  { x: body.x, y: body.y }, AGENT_URL, AGENT_TOKEN, 10000));
    if (action === 'pc-type')       return json(await agentCall('/type',   { text: body.text }, AGENT_URL, AGENT_TOKEN, 15000));
    if (action === 'pc-hotkey')     return json(await agentCall('/hotkey', { keys: body.keys }, AGENT_URL, AGENT_TOKEN, 10000));
    if (action === 'pc-sysinfo')    return json(await agentCall('/sysinfo', {}, AGENT_URL, AGENT_TOKEN, 10000));

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
