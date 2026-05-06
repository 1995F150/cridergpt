// generate-video — proxies to self-hosted CriderGPT Video Engine
// Uses HOME_SERVER_VIDEO_URL secret (e.g. https://vm.cridergpt.com:5200)
// Falls back to HOME_SERVER_AGENT_URL host if VIDEO not set.
//
// Modes:
//   { mode: "image-to-video", image: <base64 data url>, fps?, motion?, frames?, seed? }
//   { mode: "text-to-video",  prompt: string, frames?, fps?, steps?, guidance?, seed? }
//
// Returns: { ok: true, video_base64, mime: "video/mp4" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VIDEO_URL = (Deno.env.get('HOME_SERVER_VIDEO_URL')
  ?? Deno.env.get('HOME_SERVER_AGENT_URL')?.replace(/:\d+\/?$/, ':5200')
  ?? '').replace(/\/$/, '');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) throw new Error('Invalid data URL');
  const mime = m[1];
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: must be logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    if (!VIDEO_URL) {
      return json({
        error: 'Video engine not configured. Set HOME_SERVER_VIDEO_URL secret to your video_server.py endpoint (e.g. https://vm.cridergpt.com:5200).',
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? 'text-to-video');

    let upstream: Response;

    if (mode === 'image-to-video') {
      if (!body.image) return json({ error: 'image (data URL) required' }, 400);
      const { blob } = dataUrlToBlob(body.image);
      const fd = new FormData();
      fd.append('image', blob, 'frame.png');
      fd.append('fps', String(body.fps ?? 7));
      fd.append('motion', String(body.motion ?? 127));
      fd.append('frames', String(body.frames ?? 25));
      if (body.seed != null) fd.append('seed', String(body.seed));

      upstream = await fetch(`${VIDEO_URL}/video/image-to-video`, {
        method: 'POST',
        body: fd,
      });
    } else if (mode === 'text-to-video') {
      const prompt = String(body.prompt ?? '').trim();
      if (!prompt) return json({ error: 'prompt required' }, 400);
      upstream = await fetch(`${VIDEO_URL}/video/text-to-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: body.negative_prompt,
          frames: body.frames ?? 16,
          fps: body.fps ?? 8,
          steps: body.steps ?? 25,
          guidance: body.guidance ?? 7.5,
          seed: body.seed,
        }),
      });
    } else if (mode === 'health') {
      upstream = await fetch(`${VIDEO_URL}/video/health`);
      const j = await upstream.json().catch(() => ({}));
      return json({ ok: upstream.ok, engine: j });
    } else {
      return json({ error: `Unknown mode: ${mode}` }, 400);
    }

    if (!upstream.ok) {
      const errTxt = await upstream.text().catch(() => '');
      return json({ error: `Video engine error: ${upstream.status} ${errTxt.slice(0, 300)}` }, 502);
    }

    const blob = await upstream.blob();
    const b64 = await blobToBase64(blob);
    return json({ ok: true, video_base64: b64, mime: 'video/mp4' });
  } catch (e: any) {
    console.error('generate-video error', e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
