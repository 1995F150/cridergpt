import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TTS limits based on plan (monthly limits)
const TTS_LIMITS = {
  free: 10,
  plu: 500,
  plus: 500,
  pro: 2000
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Create Supabase client using service role key for database operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { text } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Get user from auth header (required for TTS)
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        userEmail = user?.email;
        console.log('Authenticated user for TTS:', userId, userEmail);
      } catch (error) {
        throw new Error('Authentication required for TTS');
      }
    } else {
      throw new Error('Authentication required for TTS');
    }

    if (!userId && !userEmail) {
      throw new Error('User authentication failed');
    }

    // For tracking, use same system as token limits
    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const trackingId = userId || userEmail || clientIp;

    console.log('Tracking TTS usage for:', trackingId);

    // Check/get usage record from same table as tokens
    let { data: usage, error: usageError } = await supabase
      .from('ai_usage')
      .select('*')
      .or(userId ? `user_id.eq.${userId}` : `email.eq.${trackingId}`)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Database error:', usageError);
      throw new Error('Failed to check usage limits');
    }

    // Create new usage record if doesn't exist
    if (!usage) {
      const { data: newUsage, error: insertError } = await supabase
        .from('ai_usage')
        .insert({
          user_id: userId,
          email: trackingId,
          tokens_used: 0,
          tts_requests: 0,
          user_plan: 'free'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create usage record:', insertError);
        throw new Error('Failed to initialize usage tracking');
      }
      usage = newUsage;
    }

    // Add tts_requests column if it doesn't exist
    if (usage.tts_requests === undefined) {
      usage.tts_requests = 0;
    }

    // Reset usage if it's a new month
    const today = new Date().toISOString().split('T')[0];
    const lastReset = usage.last_reset;
    if (lastReset && lastReset < today) {
      const { error: resetError } = await supabase
        .from('ai_usage')
        .update({ 
          tokens_used: 0,
          tts_requests: 0,
          last_reset: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id);
      
      if (!resetError) {
        usage.tokens_used = 0;
        usage.tts_requests = 0;
      }
    }

    // Check TTS limits based on user plan
    const userPlan = usage.user_plan || 'free';
    const ttsLimit = TTS_LIMITS[userPlan] || TTS_LIMITS.free;
    const currentTTSUsage = usage.tts_requests || 0;
    
    console.log(`User plan: ${userPlan}, TTS Used: ${currentTTSUsage}, TTS Limit: ${ttsLimit}`);

    if (currentTTSUsage >= ttsLimit) {
      return new Response(JSON.stringify({ 
        error: "You've hit your plan's TTS limit! 🚫 Upgrade for unlimited AI voice.",
        usage: {
          tts_used: currentTTSUsage,
          tts_limit: ttsLimit,
          plan: userPlan
        }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Your custom voice ID
    const VOICE_ID = 'DM5m1QntqMVnJ0y5FY4K';

    // Generate speech using ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Increment TTS usage count after successful response
    const { error: updateError } = await supabase
      .from('ai_usage')
      .update({ 
        tts_requests: currentTTSUsage + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);

    if (updateError) {
      console.error('Failed to update TTS usage count:', updateError);
    }

    console.log('TTS generated successfully, usage updated');

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        usage: {
          tts_used: currentTTSUsage + 1,
          tts_limit: ttsLimit,
          plan: userPlan,
          tts_remaining: ttsLimit - (currentTTSUsage + 1)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});