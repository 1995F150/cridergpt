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

    if (action === 'youtube') {
      // Build a yt-dlp command from structured inputs and forward as a normal command
      const url = String(body.url ?? '').trim();
      if (!/^https?:\/\//i.test(url)) return json({ error: 'valid url required' }, 400);
      const format = String(body.format ?? 'mp4'); // mp4 | mp3
      const quality = String(body.quality ?? 'best'); // best | 1080 | 720 | 480 | 360 | 192k | 320k
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
        parts.push(
          `-f "bv*${heightFilter}+ba/b${heightFilter}" --merge-output-format mp4`,
        );
      }
      parts.push(`-o "${outDir}/%(title).100s [%(id)s].%(ext)s"`);
      parts.push(`'${safeUrl}'`);
      const ytCmd = parts.join(' ');

      if (!AGENT_URL) {
        return json({ command: ytCmd, error: 'HOME_SERVER_AGENT_URL not set — copy this command and run it on the server.' }, 200);
      }
      const t0 = Date.now();
      try {
        const res = await fetch(AGENT_URL.replace(/\/$/, '') + '/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: ytCmd }),
          signal: AbortSignal.timeout(600000),
        });
        const text = await res.text();
        return json({ status: res.status, ok: res.ok, latency_ms: Date.now() - t0, command: ytCmd, output: text });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : String(e), command: ytCmd, latency_ms: Date.now() - t0 }, 502);
      }
    }

    if (action === 'command') {
      const command = String(body.command ?? '').trim();
      if (!command) return json({ error: 'command is required' }, 400);
      if (!AGENT_URL) {
        return json({
          error:
            'Agent not connected. Install the agent on the home server (Setup tab) and add HOME_SERVER_AGENT_URL as a Supabase secret. Once connected, this command will run on the server.',
          command,
          agent_configured: false,
        });
      }

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
