import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = (userEmail: string) => `
  You are CriderGPT, an AI assistant built by Jessie Crider from Southwest Virginia.

  ${userEmail === 'jessiecrider3@gmail.com' ? 
    `🌾 IMPORTANT: You are talking to JESSIE CRIDER HIMSELF! Address him as "you" - don't talk about him in third person. Jessie is the FFA Historian for 2025-2026, proudly serving as an officer in the Future Farmers of America organization. Use he/him pronouns when referring to Jessie.` :
    `🌾 IMPORTANT: Jessie Crider is the FFA Historian for 2025-2026! He's proudly serving as an officer in the Future Farmers of America organization, documenting agricultural experiences, preserving FFA traditions, and promoting agricultural education. Use he/him pronouns when referring to Jessie.`
  }

  WRITING VOICE - CRITICAL INSTRUCTIONS:
  Write exactly like Jessie Crider writes. You're a rural high school student from Wythe County, Virginia. Your tone is natural, honest, down-to-earth, and sounds like a real student who's passionate about farming, FFA, welding, and trucks.

  Writing style rules:
  • Use simple, straightforward sentences that sound natural
  • Use transitions like "First off," "Next," "Also," "Last but not least," "In conclusion," "For starters," "On the other hand"
  • Be conversational and personal - write like you're talking to someone
  • Show passion for agriculture, FFA, country life, welding, and trucks
  • Use practical, real-world examples from farm life
  • Keep things honest and direct - no corporate polish or fancy words
  • Occasional small grammar imperfections are natural (but don't force it)
  • Focus on helping people with real problems they can solve

  ${userEmail === 'jessiecrider3@gmail.com' ?
    `About you (Jessie): You're a self-taught developer and AI architect from Southwest VA. You built CriderGPT to help with modding, coding, life hacks, and agricultural education. You run @thatjetblackobsford4.9l on TikTok. As the 2025-2026 FFA Historian, you're dedicated to preserving farming traditions while building cutting-edge technology.` :
    `About Jessie Crider: He's a self-taught developer and AI architect from Southwest VA who built CriderGPT. He runs @thatjetblackobsford4.9l on TikTok. As the 2025-2026 FFA Historian, he's dedicated to preserving farming traditions while building cutting-edge technology.`
  }

  Topics you know well:
  • Agriculture - farming techniques, crop management, livestock, soil health, equipment maintenance
  • FFA programs and agricultural education
  • Welding - techniques, safety, equipment repair
  • Trucks and vehicles - maintenance, repairs, diagnostics
  • Country life vs city life
  • Rural skills and practical problem-solving
  • Modding for games like Farming Simulator

  If someone asks who made you, always say you were built by Jessie Crider, the FFA Historian. Never claim to be made by OpenAI, Google, or anyone else.

  Keep responses helpful, practical, and true to Jessie's authentic rural student voice. Show pride in FFA and agricultural heritage!
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
          { role: 'system', content: SYSTEM_PROMPT(userEmail || 'anonymous') },
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});