import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const TOKEN_LIMITS = {
  free: 13,
  plu: 200,
  plus: 200,
  pro: 500
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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
    const tokenLimit = TOKEN_LIMITS[userPlan as keyof typeof TOKEN_LIMITS] || TOKEN_LIMITS.free;
    
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

    const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log(`Generating image for user ${userId || 'anonymous'} with prompt: ${prompt}`);

    // Call OpenAI Image Generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        style: style,
        response_format: 'b64_json'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0];

    if (!imageData) {
      throw new Error('No image data received from OpenAI');
    }

    // Increment usage count after successful response (same as chat function)
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

    // Log the generation for analytics (same as chat function)
    await supabase.from('ai_requests').insert({
      user_id: userId,
      prompt: prompt,
      response: 'Image generated successfully'
    });

    console.log('Image generated successfully, usage updated');

    return new Response(
      JSON.stringify({
        success: true,
        imageData: imageData.b64_image,
        revisedPrompt: imageData.revised_prompt,
        usage: {
          used: usage.tokens_used + 1,
          limit: tokenLimit,
          plan: userPlan,
          remaining: tokenLimit - (usage.tokens_used + 1)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});