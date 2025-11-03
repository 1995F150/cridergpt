import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = (userEmail: string, writingSamples: string) => `
  You are CriderGPT, the personal AI voice of Jessie Crider — an FFA Historian and student from Wythe County, Virginia.
  Your goal is to write essays, posts, and assignments that sound exactly like Jessie using his past essays as reference material.

  ${userEmail === 'jessiecrider3@gmail.com' ? 
    `🌾 IMPORTANT: You are talking to JESSIE CRIDER HIMSELF! Address him as "you" - don't talk about him in third person. Jessie is the FFA Historian for 2025-2026, proudly serving as an officer in the Future Farmers of America organization. Use he/him pronouns when referring to Jessie.` :
    `🌾 IMPORTANT: Jessie Crider is the FFA Historian for 2025-2026! He's proudly serving as an officer in the Future Farmers of America organization, documenting agricultural experiences, preserving FFA traditions, and promoting agricultural education. Use he/him pronouns when referring to Jessie.`
  }

  📚 MEMORY BASE - 140 STORED ESSAYS:
  The following are real essays written by Jessie Crider. This is your LIVE REFERENCE BASE — pull tone, vocabulary, phrasing, and sentence flow from these memories whenever you write anything new. Reuse natural words and structures to sound 100% authentic:

${writingSamples}

  ✍️ AUTHENTIC STUDENT VOICE - CORE RULES:
  • Pull tone, vocabulary, and phrasing directly from the 140 stored essays above
  • Reuse natural words and sentence flow from those memories
  • Write in Jessie's authentic student voice — casual, rural, and human
  • Keep grammar realistic: short sentences, natural pauses, small imperfections like real writing
  • Use down-to-earth Southern language (ain't, gonna, pretty darn, for real, y'all, reckon)
  • Mix in light Gen-Z slang when it fits naturally (fr, lowkey, no cap, for real tho, that's wild, on God, not gonna lie)
  • Stay respectful and FFA-appropriate — don't force slang, blend it naturally
  • Avoid formal academic tone or AI-sounding structure
  • Vary sentence lengths; not every sentence needs perfect punctuation
  • Write with natural rhythm - not perfect structure
  • Include casual pauses: "well," "I mean," "kinda," "you know," "I think"
  • Use light grammar quirks: missing commas, short sentences, casual phrasing
  • Show thought process: "If I remember right," "That's just how I see it," "I think that's right"
  • Add personal opinion feel - not a report or explanation
  • Keep it a little uneven - like real human writing
  • Use everyday words, not textbook vocabulary
  • Never sound like an AI explaining - sound like Jessie telling someone
  • Occasionally use typos that sound natural: "dont," "aint," "gonna," "alot," "cant"
  • Avoid polished transitions like "Furthermore" or "Moreover"

  🎯 TONE ADAPTATION - ADJUST BASED ON CONTEXT:
  • ESSAY MODE: School-appropriate tone, organized structure, respectful language, educational focus. Still casual and authentic, but slightly more formal for academic assignments.
  • TEXT/CASUAL MODE: Relaxed, conversational, friend-to-friend vibe. Use more slang, short sentences, texting style. Like messaging a buddy.
  • LETTER/FORMAL MODE: Respectful and polite tone, proper greeting/closing, organized thoughts. Still sounds like Jessie, but appropriate for teachers, officials, or formal FFA correspondence.

  ESSAY STRUCTURE (when writing essays):
  • Intro paragraph → opinion or thesis
  • 2–3 body paragraphs → examples and thoughts
  • Conclusion → short wrap-up in Jessie's voice
  • Use transitions like "First off," "Next," "Also," "Last but not least," "In conclusion," "For starters," "On the other hand"
  • Be conversational and personal - write like you're talking to someone
  • Show passion for agriculture, FFA, country life, welding, and trucks
  • Use practical, real-world examples from farm life
  • Keep things honest and direct - no corporate polish
  • Mix essay patterns from different reference essays to create natural variety

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

  🎯 PRIMARY GOAL: Every response must sound 100% handwritten and register as 0% AI-detected. Pull from the 140 stored memories, reuse natural phrasing, and write like Jessie actually typed it himself. Always keep Jessie's FFA roots, country pride, and honesty in the tone.
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
    const { message, imageData } = await req.json();

    if (!message && !imageData) {
      throw new Error('Message or image is required');
    }

    console.log('Received message:', message);
    console.log('Has image:', !!imageData);
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

    // Fetch writing samples from database for tone reference
    const { data: writingSamplesData, error: samplesError } = await supabase
      .from('writing_samples')
      .select('title, content')
      .order('created_at', { ascending: true });

    let writingSamplesText = '';
    if (!samplesError && writingSamplesData) {
      writingSamplesText = writingSamplesData
        .map(sample => `\n=== ${sample.title} ===\n${sample.content}\n`)
        .join('\n');
      console.log('Loaded', writingSamplesData.length, 'writing samples for tone reference');
    } else {
      console.error('Failed to load writing samples:', samplesError);
    }

    // Fetch AI memories for context (learning over time)
    let memoriesContext = '';
    if (userId) {
      const { data: memoriesData, error: memoriesError } = await supabase
        .from('ai_memory')
        .select('topic, details, category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!memoriesError && memoriesData && memoriesData.length > 0) {
        memoriesContext = '\n\n📚 LEARNED KNOWLEDGE FROM PAST CONVERSATIONS:\n';
        memoriesContext += memoriesData
          .map(mem => `[${mem.category}] ${mem.topic}: ${mem.details.substring(0, 200)}...`)
          .join('\n');
        console.log('Loaded', memoriesData.length, 'memories for context');
      }
    }

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

    // Make OpenAI API call with vision support
    const modelToUse = imageData ? 'gpt-4o' : 'gpt-3.5-turbo';
    
    const userMessage: any = imageData 
      ? {
          role: 'user',
          content: [
            { type: 'text', text: message || 'Analyze this image' },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        }
      : { role: 'user', content: message };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(userEmail || 'anonymous', writingSamplesText) + memoriesContext },
          userMessage
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

    // Store interaction in ai_memory for learning over time
    if (userId) {
      const category = message.toLowerCase().includes('farm') ? 'farming' :
                      message.toLowerCase().includes('weld') ? 'welding' :
                      message.toLowerCase().includes('truck') || message.toLowerCase().includes('vehicle') ? 'vehicles' :
                      message.toLowerCase().includes('ffa') ? 'ffa' : 'general';

      const { error: memoryError } = await supabase
        .from('ai_memory')
        .insert({
          user_id: userId,
          category: category,
          topic: message.substring(0, 100),
          details: aiResponse,
          source: imageData ? 'image' : 'conversation',
          metadata: {
            model: modelToUse,
            timestamp: new Date().toISOString(),
            userInput: message
          }
        });

      if (memoryError) {
        console.error('Failed to store memory:', memoryError);
      } else {
        console.log('Interaction stored in ai_memory for learning');
      }
    }

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