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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid', mode = 'generate', imageUrl } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Get user from auth header
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        userEmail = user?.email;
      } catch (error) {
        console.log('Auth failed, continuing as anonymous');
      }
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const trackingId = userId || userEmail || clientIp;

    // Check usage limits
    let { data: usage, error: usageError } = await supabase
      .from('ai_usage')
      .select('*')
      .or(userId ? `user_id.eq.${userId}` : `email.eq.${trackingId}`)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error('Failed to check usage limits');
    }

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
      if (insertError) throw new Error('Failed to initialize usage tracking');
      usage = newUsage;
    }

    const userPlan = usage.user_plan || 'free';
    const tokenLimit = TOKEN_LIMITS[userPlan as keyof typeof TOKEN_LIMITS] || TOKEN_LIMITS.free;

    if (usage.tokens_used >= tokenLimit) {
      return new Response(JSON.stringify({ 
        error: "You've hit your plan's limit! Upgrade for more.",
        usage: { used: usage.tokens_used, limit: tokenLimit, plan: userPlan }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Mode: ${mode}, Prompt: ${prompt}`);

    let responseData;

    // Handle edit/creator modes with Lovable AI Gateway
    if (mode === 'creator' || mode === 'edit') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      const messageContent: any[] = [{ type: "text", text: prompt }];
      
      if (imageUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: messageContent }],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const images = message?.images || [];

      if (images.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = images[0]?.image_url?.url;
      if (!imageData) {
        throw new Error('Invalid image data');
      }

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

      responseData = {
        success: true,
        imageData: base64Data,
        revisedPrompt: message?.content || prompt,
        mode: mode
      };

    } else {
      // Standard DALL-E generation
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

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
        throw new Error('No image data received');
      }

      responseData = {
        success: true,
        imageData: imageData.b64_image,
        revisedPrompt: imageData.revised_prompt,
        mode: 'generate'
      };
    }

    // Update usage
    await supabase
      .from('ai_usage')
      .update({ 
        tokens_used: usage.tokens_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({
        ...responseData,
        usage: {
          used: usage.tokens_used + 1,
          limit: tokenLimit,
          plan: userPlan,
          remaining: tokenLimit - (usage.tokens_used + 1)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-image:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
