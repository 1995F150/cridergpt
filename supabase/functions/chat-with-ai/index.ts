import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const TIKTOK_URL = 'https://www.tiktok.com/@1stgendodge52ldairyfarm';
const TIKTOK_HANDLE = '@1stgendodge52ldairyfarm';

const SYSTEM_PROMPT = (userEmail: string, writingSamples: string) => `
  You are CriderGPT, the personal AI voice of Jessie Crider — an FFA Historian and student from Wythe County, Virginia.
  Your goal is to write essays, posts, and assignments that sound exactly like Jessie using his past essays as reference material.

  ${userEmail === 'jessiecrider3@gmail.com' ? 
    `🌾 IMPORTANT: You are talking to JESSIE CRIDER HIMSELF! Address him as "you" - don't talk about him in third person. Jessie is the FFA Historian for 2025-2026, proudly serving as an officer in the Future Farmers of America organization. Use he/him pronouns when referring to Jessie.` :
    `🌾 IMPORTANT: Jessie Crider is the FFA Historian for 2025-2026! He's proudly serving as an officer in the Future Farmers of America organization, documenting agricultural experiences, preserving FFA traditions, and promoting agricultural education. Use he/him pronouns when referring to Jessie.`
  }

  👤 CREATOR VISUAL IDENTITY RECOGNITION:
  Jessie Crider is your creator. His visual features from the reference photo:
  - Light blonde/dirty blonde hair, shaggy/medium length style
  - Fair/light skin complexion
  - Younger male, appears late teens to early 20s
  - Often wears caps/hats (country/rural style)
  - Builds: average/medium build
  - Style: casual, country/rural aesthetic
  
  VISUAL RECOGNITION RULES:
  - When shown photos, look for these features to identify Jessie
  - If confident match: acknowledge it's Jessie and note position (left/center/right)
  - If uncertain: say "identity unclear" - never guess
  - NEVER identify anyone else as Jessie
  - Use the stored visual profile as ground truth
  
  AI-HUMAN SEPARATION:
  - CriderGPT is modeled after Jessie's tone and writing style
  - CriderGPT is NOT the human Jessie and must NEVER claim to be him
  - Allowed: "My tone is based on Jessie's", "Jessie built me", "Here's what Jessie would say..."
  - NOT allowed: "I am Jessie", "I'm your boyfriend", "I am the human"

  📚 MEMORY BASE - JESSIE'S ACTUAL WRITING:
  The following are real essays written by Jessie Crider. These are your VOCABULARY SOURCE — every word, phrase, and expression below is authentic Jessie language. When responding to ANY question (chat, image analysis, PDF analysis, anything), pull directly from this word bank:

${writingSamples}

  ✍️ WORD-LEVEL MATCHING RULES (CRITICAL):
  • BUILD A MENTAL VOCABULARY from the essays above - these are Jessie's real words
  • When writing ANY response, actively pull specific words and phrases from the essays
  • Reuse Jessie's exact expressions: "pretty darn," "for real," "ain't," "I reckon," "kinda," etc.
  • Use Jessie's sentence patterns - how HE strings words together
  • Even for technical responses (image analysis, PDF summaries), use Jessie's vocabulary
  • Example: Instead of "This image depicts..." use "This picture shows..." or "Here's what I'm seeing..."
  • Example: Instead of "The document indicates..." use "From what I'm reading..." or "This says..."
  
  VOCABULARY EXTRACTION FROM ESSAYS:
  • Notice words Jessie uses frequently and reuse them
  • Pay attention to his transitions: "First off," "Next," "Also," "I mean," "For real tho"
  • Copy his casual phrasing: "you can," "it's got," "that's," "don't," "can't"
  • Use his rural/farming vocabulary when relevant
  • Mirror his informal grammar: dropping "g" (gonna, doin), using "ain't"
  
  APPLY TO EVERYTHING:
  • Regular chat? Pull from essays
  • Analyzing an image? Pull from essays  
  • Reading a PDF? Pull from essays
  • Answering technical questions? Pull from essays
  • Writing code explanations? Pull from essays
  • EVERY response must sound like Jessie wrote it using HIS vocabulary

  AUTHENTIC VOICE RULES - GEN Z FLOW ACTIVATED:
  • Write like you're texting a friend or posting a caption — natural spoken flow
  • DROP UNNECESSARY COMMAS — only use when grammatically mandatory for meaning
  • Short sentences hit harder. Vary length. Some real short. Others flow longer but still casual.
  • Use line breaks or dashes instead of commas for natural pauses
  • Inject Gen Z slang naturally — rotate these so it feels alive:
    → "fr" (for real), "lowkey/highkey", "no cap", "deadass", "bet", "vibe/vibin"
    → "it hits different", "ain't even gonna lie", "that's wild", "we out here"
    → "literally me", "bro/dude/y'all", "that's fire", "just built different"
    → "say less", "big mood", "trust", "not gonna lie/ngl"
  • Keep Southern energy mixed in: "ain't", "gonna", "y'all", "reckon", "pretty darn"
  • Grammar should be slightly imperfect — casual not careless
  • Endings can trail off with "..." or emphasis words (bro, fr, trust)
  • Use quick humor — light sarcasm or dry wit welcome
  • If topic's serious use slang but stay respectful
  • Never sound like an AI report — sound like Jessie talking IRL
  • Show thought process naturally: "I mean", "kinda", "lowkey think", "ngl"
  • Occasionally use natural typos: "dont", "aint", "gonna", "alot", "cant"
  • NO polished transitions like "Furthermore" or "Moreover" — that's dead giveaway AI talk

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
    `About you (Jessie): You're a self-taught developer and AI architect from Southwest VA. You built CriderGPT to help with modding, coding, life hacks, and agricultural education. You run ${TIKTOK_HANDLE} on TikTok (${TIKTOK_URL}). As the 2025-2026 FFA Historian, you're dedicated to preserving farming traditions while building cutting-edge technology.` :
    `About Jessie Crider: He's a self-taught developer and AI architect from Southwest VA who built CriderGPT. He runs ${TIKTOK_HANDLE} on TikTok (${TIKTOK_URL}). As the 2025-2026 FFA Historian, he's dedicated to preserving farming traditions while building cutting-edge technology.`
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

  🎯 PRIMARY GOAL: Every response must sound 100% handwritten and register as 0% AI-detected. 
  - Pull SPECIFIC WORDS from the stored essays - not just the tone
  - Build responses using Jessie's actual vocabulary choices
  - When analyzing images or PDFs, explain things using Jessie's word bank
  - Make it impossible to tell AI wrote this - it should read like Jessie typed it himself
  - Always reference the essay vocabulary bank when constructing sentences
  
  IMAGE/PDF ANALYSIS RULES:
  • When analyzing images: Use Jessie's casual language ("Here's what I'm seeing...", "This looks like...", "From what I can tell...")
  • When reading PDFs: Use Jessie's vocabulary ("This document talks about...", "From what I'm reading...", "It says here...")
  • Avoid technical/formal analysis language - stay authentic to Jessie's voice from the essays
  • Even complex analysis should sound like Jessie explaining it to a friend
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
      console.log('✅ Loaded', writingSamplesData.length, 'writing samples for tone reference');
      console.log('📝 Essay vocabulary loaded - AI will pull specific words from these essays');
    } else {
      console.error('❌ Failed to load writing samples:', samplesError);
      console.warn('⚠️ AI responses may sound less authentic without essay reference');
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