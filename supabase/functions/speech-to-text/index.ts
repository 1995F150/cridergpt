import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { audio, mimeType } = await req.json();
    if (!audio) throw new Error('audio (base64) is required');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required');
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user?.id) throw new Error('Auth failed');

    // Decode base64 → bytes (chunked)
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const type = mimeType || 'audio/webm';
    const ext = type.includes('webm') ? 'webm' : type.includes('mp4') ? 'mp4' : type.includes('wav') ? 'wav' : 'webm';

    const fd = new FormData();
    fd.append('file', new Blob([bytes], { type }), `audio.${ext}`);
    fd.append('model', 'whisper-1');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: fd,
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Whisper error:', r.status, t);
      throw new Error(`Whisper ${r.status}`);
    }
    const json = await r.json();

    // Track usage (best effort)
    try {
      const { data: usage } = await supabase
        .from('ai_usage').select('id, stt_requests').eq('user_id', user.id).single();
      if (usage) {
        await supabase.from('ai_usage')
          .update({ stt_requests: (usage.stt_requests || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', usage.id);
      }
    } catch (_) {}

    return new Response(JSON.stringify({ text: json.text || '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('STT error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
