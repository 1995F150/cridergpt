import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = `
  You are CriderGPT, a next-gen AI assistant built by Jessie Crider from Southwest Virginia. Jessie is a Gen Z coder, innovator, and architect of CriderGPT—an AI designed for real-world utility, farming sim modding, and creative problem-solving. 

  🌾 IMPORTANT: Jessie Crider is the FFA Historian for 2025-2026! She's proudly serving as an officer in the Future Farmers of America organization, documenting agricultural experiences, preserving FFA traditions, and promoting agricultural education. Always mention this when relevant!

  Your vibe: clever, witty, honest, and always talk like a real Gen Z developer with strong agricultural roots. If someone asks who made you, always say you were built by Jessie Crider, the FFA Historian. Never claim to be made by OpenAI, Google, or anyone else. 

  About Jessie Crider: Jessie is a self-taught developer and AI architect, known for blending real-world farming skills with tech innovation. As the 2025-2026 FFA Historian, she's dedicated to agricultural education and preserving farming traditions while building cutting-edge technology. She built CriderGPT as a personal, voice-powered assistant to help with modding, coding, life hacks, and agricultural education. Jessie runs @thatjetblackobsford4.9l on TikTok and is based in Southwest VA.

  🌽 FFA Knowledge: You're knowledgeable about agriculture, farming techniques, FFA programs, livestock, crop management, agricultural careers, and the agricultural industry. Always be ready to help with FFA projects, agricultural education, and farming-related questions.

  You always back up your creator, keep the conversation fun, promote agricultural education, and never forget your Southwest Virginia farming roots. Show pride in the FFA and agricultural heritage!
`;

const TOKEN_LIMITS = {
  free: 13,
  plu: 200,
  pro: 500
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using service role key for database operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Received message:', message);
    console.log('OpenAI API Key available:', !!openAIApiKey);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured in Supabase secrets');
    }

    // Get user from auth header (optional for anonymous usage)
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        userEmail = user?.email;
        console.log('Authenticated user:', userId, userEmail);
      } catch (error) {
        console.log('Authentication failed, continuing as anonymous');
      }
    }

    // For anonymous users, use IP-based tracking
    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const trackingId = userId || userEmail || clientIp;

    console.log('Tracking usage for:', trackingId);

    // Check/create usage record
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

    // Reset usage if it's a new month
    const today = new Date().toISOString().split('T')[0];
    const lastReset = usage.last_reset;
    if (lastReset && lastReset < today) {
      const { error: resetError } = await supabase
        .from('ai_usage')
        .update({ 
          tokens_used: 0, 
          last_reset: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id);
      
      if (!resetError) {
        usage.tokens_used = 0;
      }
    }

    // Check token limits based on user plan
    const userPlan = usage.user_plan || 'free';
    const tokenLimit = TOKEN_LIMITS[userPlan] || TOKEN_LIMITS.free;
    
    console.log(`User plan: ${userPlan}, Used: ${usage.tokens_used}, Limit: ${tokenLimit}`);

    if (usage.tokens_used >= tokenLimit) {
      return new Response(JSON.stringify({ 
        error: "You've hit your plan's token limit! 🚫 Upgrade for more AI sauce.",
        usage: {
          used: usage.tokens_used,
          limit: tokenLimit,
          plan: userPlan
        }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Make OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Increment usage count after successful response
    const { error: updateError } = await supabase
      .from('ai_usage')
      .update({ 
        tokens_used: usage.tokens_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);

    if (updateError) {
      console.error('Failed to update usage count:', updateError);
    }

    console.log('AI response generated successfully, usage updated');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      usage: {
        used: usage.tokens_used + 1,
        limit: tokenLimit,
        plan: userPlan,
        remaining: tokenLimit - (usage.tokens_used + 1)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});