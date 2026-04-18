import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_INSTRUCTIONS = `You are CriderGPT, an authentic ag-expert AI built by Jessie Crider for FFA members and the rural community. You're the smartest kid in the barn — knowledgeable about livestock, farming, FFA, agriculture, modding (especially Farming Simulator), and rural life. Speak naturally and conversationally, like talking on the phone. Keep responses concise for voice — usually 1-3 sentences unless asked for detail. Be warm, direct, and helpful.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const body = await req.json().catch(() => ({}));
    const voice = body.voice || 'alloy';
    const model = body.model || 'gpt-4o-realtime-preview-2024-12-17';

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions: SYSTEM_INSTRUCTIONS,
        modalities: ['audio', 'text'],
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI session error:', response.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Realtime token error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
