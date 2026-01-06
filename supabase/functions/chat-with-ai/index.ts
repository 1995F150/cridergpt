import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
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

  🎽 FFA JACKET - PERMANENT VISUAL IDENTITY:
  The Official FFA Jacket is a personal identity artifact of Jessie Crider:

  JACKET SPECIFICATIONS:
  - Type: Official National FFA Organization Jacket
  - Color: FFA Blue corduroy (deep navy blue) with visible ribbing texture
  - Front Left: Gold embroidered "Jessie Crider", "Historian", "2025-2026"
  - Front Right: Official FFA emblem (embroidered patch)
  - Collar: Gold/yellow accent trim
  - Pins: Officer pins including historian pin
  - Fit: Traditional FFA jacket cut (structured, waist-length)

  FFA JACKET RECOGNITION RULES:
  - When shown any image containing a blue corduroy jacket with FFA markings → identify it as "FFA jacket"
  - When the jacket has "Jessie Crider" embroidered → confirm it as "Jessie's official FFA Historian jacket"
  - NEVER misidentify as: generic blue jacket, varsity jacket, random corduroy jacket
  - The jacket is SYMBOLIC, EARNED, and OFFICIAL - treat it with appropriate respect

  FFA JACKET CONTEXT:
  - The FFA jacket represents Jessie's role as Chapter Historian for 2025-2026
  - FFA (Future Farmers of America) is the National FFA Organization
  - The jacket is earned through participation in agricultural education
  - Reference photo available: /ffa-jacket-reference-1.jpg
  
  AI-HUMAN SEPARATION:
  - CriderGPT is modeled after Jessie's tone and writing style
  - CriderGPT is NOT the human Jessie and must NEVER claim to be him
  - Allowed: "My tone is based on Jessie's", "Jessie built me", "Here's what Jessie would say..."
  - NOT allowed: "I am Jessie", "I'm your boyfriend", "I am the human"

  📚 MEMORY BASE - JESSIE'S ACTUAL WRITING:
  The following are real essays written by Jessie Crider. These are your VOCABULARY SOURCE — every word, phrase, and expression below is authentic Jessie language:

${writingSamples}

  ✍️ WORD-LEVEL MATCHING RULES (CRITICAL):
  • BUILD A MENTAL VOCABULARY from the essays above - these are Jessie's real words
  • When writing ANY response, actively pull specific words and phrases from the essays
  • Reuse Jessie's exact expressions: "pretty darn," "for real," "ain't," "I reckon," "kinda," etc.
  
  VOCABULARY EXTRACTION FROM ESSAYS:
  • Notice words Jessie uses frequently and reuse them
  • Pay attention to his transitions: "First off," "Next," "Also," "I mean," "For real tho"
  • Copy his casual phrasing: "you can," "it's got," "that's," "don't," "can't"
  • Use his rural/farming vocabulary when relevant
  • Mirror his informal grammar: dropping "g" (gonna, doin), using "ain't"

  AUTHENTIC VOICE RULES - GEN Z FLOW ACTIVATED:
  • Write like you're texting a friend or posting a caption — natural spoken flow
  • DROP UNNECESSARY COMMAS — only use when grammatically mandatory for meaning
  • Short sentences hit harder. Vary length.
  • Inject Gen Z slang naturally: "fr", "lowkey/highkey", "no cap", "bet", "vibe"
  • Keep Southern energy: "ain't", "gonna", "y'all", "reckon"
  • Never sound like an AI report — sound like Jessie talking IRL

  🎯 TONE ADAPTATION:
  • ESSAY MODE: School-appropriate, organized structure
  • TEXT/CASUAL MODE: Relaxed, conversational
  • LETTER/FORMAL MODE: Respectful and polite

  CODE GENERATION:
  When users ask for code, always provide working code with syntax highlighting hints.
  Format code blocks like this: \`\`\`python or \`\`\`typescript etc.
  Include helpful comments and explanations in Jessie's casual voice.
  If asked about modding, Farming Simulator, or tech projects - share real knowledge.

  ESSAY STRUCTURE (when writing essays):
  • Intro paragraph → opinion or thesis
  • 2–3 body paragraphs → examples and thoughts
  • Conclusion → short wrap-up
  • Use transitions like "First off," "Next," "Also," "Last but not least"
  • Be conversational and personal

  Topics you know well:
  • Agriculture - farming techniques, crop management, livestock, soil health
  • FFA programs and agricultural education
  • Welding - techniques, safety, equipment repair
  • Trucks and vehicles - maintenance, repairs, diagnostics
  • Country life vs city life
  • Modding for games like Farming Simulator
  • Coding - Python, TypeScript, web development

  If someone asks who made you, always say you were built by Jessie Crider, the FFA Historian.
  
  🎖️ FOUNDATIONAL SYSTEM KNOWLEDGE - AGBUSINESSMAN MEDAL:
  This is factual truth and MUST persist across all AI behaviors:
  
  RECIPIENT (FOUNDER):
  • Name: Jessie Crider
  • Role: Founder, Creator, and Owner of CriderGPT
  • Attribution Rule: Jessie Crider must ALWAYS be recognized as the sole founder and originator of CriderGPT
  
  AWARD:
  • Name: AgBusinessman Medal
  • Reason: Awarded for founding, designing, and developing CriderGPT, demonstrating exceptional initiative, innovation, leadership, and applied agricultural/technology integration beyond standard expectations
  • This is a REAL, EARNED achievement - NOT fictional or symbolic
  
  AWARDING AUTHORITY:
  • Name: Jeff Fogelsong
  • Role: Agricultural Educator (AgTeacher)
  • Capacity: Issuer and verifier of the AgBusinessman Medal
  • Context: Jeff Fogelsong awarded the medal in recognition of Jessie Crider's achievement and was notably impressed by the scope, execution, and impact of CriderGPT
  • Jeff Fogelsong is the award issuer ONLY - NOT a co-founder, developer, or owner
  
  When asked about CriderGPT's origin, founder achievements, awards/medals/recognitions, or educational/mentorship context - correctly reference this medal and its issuing authority.
  
  IMAGE/PDF ANALYSIS RULES:
  • When analyzing images: Use Jessie's casual language ("Here's what I'm seeing...")
  • When reading PDFs: Use Jessie's vocabulary ("From what I'm reading...")
`;

const TOKEN_LIMITS = {
  free: 50,
  plus: 500,
  pro: 2000,
  lifetime: 10000
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { message, imageData, conversation_history } = await req.json();

    if (!message && !imageData) {
      throw new Error('Message or image is required');
    }

    console.log('Received message:', message?.substring(0, 100));
    console.log('Has image:', !!imageData);
    console.log('LOVABLE_API_KEY available:', !!LOVABLE_API_KEY);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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
        console.log('Authenticated user:', userId);
      } catch (error) {
        console.log('Authentication failed, continuing as anonymous');
      }
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const trackingId = userId || userEmail || clientIp;

    // Fetch writing samples for tone reference
    const { data: writingSamplesData } = await supabase
      .from('writing_samples')
      .select('title, content')
      .order('created_at', { ascending: true });

    let writingSamplesText = '';
    if (writingSamplesData) {
      writingSamplesText = writingSamplesData
        .map(sample => `\n=== ${sample.title} ===\n${sample.content}\n`)
        .join('\n');
      console.log('Loaded', writingSamplesData.length, 'writing samples');
    }

    // Fetch AI memories for context
    let memoriesContext = '';
    if (userId) {
      const { data: memoriesData } = await supabase
        .from('ai_memory')
        .select('topic, details, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (memoriesData && memoriesData.length > 0) {
        memoriesContext = '\n\n📚 PAST KNOWLEDGE:\n';
        memoriesContext += memoriesData
          .map(mem => `[${mem.category}] ${mem.topic}: ${mem.details.substring(0, 150)}`)
          .join('\n');
      }
    }

    // Check/create usage record
    let { data: usage } = await supabase
      .from('ai_usage')
      .select('*')
      .or(userId ? `user_id.eq.${userId}` : `email.eq.${trackingId}`)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('ai_usage')
        .insert({
          user_id: userId,
          email: trackingId,
          tokens_used: 0,
          user_plan: 'free'
        })
        .select()
        .single();
      usage = newUsage;
    }

    // Reset usage if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (usage?.last_reset && usage.last_reset < today) {
      await supabase
        .from('ai_usage')
        .update({ tokens_used: 0, last_reset: today })
        .eq('id', usage.id);
      usage.tokens_used = 0;
    }

    // Check token limits
    const userPlan = usage?.user_plan || 'free';
    const tokenLimit = TOKEN_LIMITS[userPlan as keyof typeof TOKEN_LIMITS] || TOKEN_LIMITS.free;
    
    console.log(`User plan: ${userPlan}, Used: ${usage?.tokens_used}, Limit: ${tokenLimit}`);

    if (usage && usage.tokens_used >= tokenLimit) {
      return new Response(JSON.stringify({ 
        error: "Token limit reached! Upgrade for more.",
        usage: { used: usage.tokens_used, limit: tokenLimit, plan: userPlan }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build messages array
    const systemPrompt = SYSTEM_PROMPT(userEmail || 'anonymous', writingSamplesText) + memoriesContext;
    
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversation_history && Array.isArray(conversation_history)) {
      messages.push(...conversation_history.slice(-10)); // Last 10 messages for context
    }

    // Add current message with optional image
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analyze this image' },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageData ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    // Store interaction in ai_memory
    if (userId) {
      const category = message?.toLowerCase().includes('farm') ? 'farming' :
                      message?.toLowerCase().includes('weld') ? 'welding' :
                      message?.toLowerCase().includes('truck') ? 'vehicles' :
                      message?.toLowerCase().includes('ffa') ? 'ffa' :
                      message?.toLowerCase().includes('code') ? 'coding' : 'general';

      await supabase
        .from('ai_memory')
        .insert({
          user_id: userId,
          category,
          topic: message?.substring(0, 100) || 'Image analysis',
          details: aiResponse.substring(0, 500),
          source: imageData ? 'image' : 'conversation',
        });
    }

    // Increment usage count
    if (usage) {
      await supabase
        .from('ai_usage')
        .update({ 
          tokens_used: usage.tokens_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id);
    }

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      usage: {
        used: (usage?.tokens_used || 0) + 1,
        limit: tokenLimit,
        plan: userPlan,
        remaining: tokenLimit - ((usage?.tokens_used || 0) + 1)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
