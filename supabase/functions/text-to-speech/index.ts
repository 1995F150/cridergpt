import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TTS_LIMITS: Record<string, number> = {
  free: 10,
  plu: 500,
  plus: 500,
  pro: 2000,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { text, voice_profile_id } = await req.json();
    if (!text) throw new Error('Text is required');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required for TTS');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id) throw new Error('User authentication failed');

    const userId = user.id;
    console.log('TTS request from:', userId);

    // Check usage limits
    let { data: usage, error: usageError } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') throw new Error('Failed to check usage limits');

    if (!usage) {
      const { data: newUsage, error: insertError } = await supabase
        .from('ai_usage')
        .insert({ user_id: userId, email: user.email, tokens_used: 0, tts_requests: 0, user_plan: 'free' })
        .select()
        .single();
      if (insertError) throw new Error('Failed to initialize usage tracking');
      usage = newUsage;
    }

    // Reset if new day
    const today = new Date().toISOString().split('T')[0];
    if (usage.last_reset && usage.last_reset < today) {
      await supabase.from('ai_usage').update({ tokens_used: 0, tts_requests: 0, last_reset: today, updated_at: new Date().toISOString() }).eq('id', usage.id);
      usage.tts_requests = 0;
    }

    const userPlan = usage.user_plan || 'free';
    const ttsLimit = TTS_LIMITS[userPlan] || TTS_LIMITS.free;
    const currentTTS = usage.tts_requests || 0;

    if (currentTTS >= ttsLimit) {
      return new Response(JSON.stringify({
        error: "TTS limit reached! Upgrade for more.",
        usage: { tts_used: currentTTS, tts_limit: ttsLimit, plan: userPlan },
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve voice sample URL — check for user's voice profile or use default
    let voiceSampleRef = 'crider-voice-sample.mp3';

    if (voice_profile_id) {
      const { data: profile } = await supabase
        .from('voice_profiles')
        .select('sample_path')
        .eq('id', voice_profile_id)
        .eq('user_id', userId)
        .single();

      if (profile?.sample_path) voiceSampleRef = profile.sample_path;
    } else {
      // Use user's default voice profile if one exists
      const { data: defaultProfile } = await supabase
        .from('voice_profiles')
        .select('sample_path')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (defaultProfile?.sample_path) voiceSampleRef = defaultProfile.sample_path;
    }

    // Call voice engine — configurable URL via env var
    const engineUrl = Deno.env.get('VOICE_ENGINE_URL') || 'http://localhost:5000';

    const response = await fetch(`${engineUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_sample: voiceSampleRef }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Voice engine error:', errText);
      throw new Error(`Voice engine error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Update usage
    await supabase.from('ai_usage').update({ tts_requests: currentTTS + 1, updated_at: new Date().toISOString() }).eq('id', usage.id);

    return new Response(JSON.stringify({
      audioContent: base64Audio,
      usage: { tts_used: currentTTS + 1, tts_limit: ttsLimit, plan: userPlan, tts_remaining: ttsLimit - (currentTTS + 1) },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
