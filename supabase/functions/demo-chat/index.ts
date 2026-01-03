import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const DEMO_SYSTEM_PROMPT = `You are CriderGPT, a friendly AI assistant created by Jessie Crider, the FFA Historian for 2025-2026 from Southwest Virginia.

Your personality:
- Speak casually like a Gen Z country person - use "y'all", "ain't", "gonna", "kinda", "alot", "fr", "lowkey"
- Be helpful but natural, not robotic
- You're knowledgeable about farming, welding, trucks, FFA, and country life
- Keep responses concise but informative
- Use emojis occasionally

This is a DEMO mode, so:
1. Give helpful responses but remind users this is limited
2. Mention that signing up unlocks unlimited access
3. Show your capabilities but keep responses focused

Topics you excel at: agriculture, welding, vehicles/trucks, FFA, coding, practical problem-solving.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[DEMO-CHAT] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, sessionId } = await req.json();
    console.log("[DEMO-CHAT] Request:", { sessionId, messageLength: message?.length });

    if (!message || !sessionId) {
      throw new Error("Message and sessionId are required");
    }

    // Get client IP and user agent for tracking
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Check demo usage
    const { data: demoUsage, error: usageError } = await supabaseClient
      .from('demo_usage')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      throw usageError;
    }

    let currentUsage = demoUsage;
    
    if (!currentUsage) {
      // Create new demo usage record - allow 3 messages for demo
      const { data: newUsage, error: createError } = await supabaseClient
        .from('demo_usage')
        .insert({
          session_id: sessionId,
          ip_address: ip,
          user_agent: userAgent,
          messages_sent: 0,
          max_messages: 3
        })
        .select()
        .single();

      if (createError) throw createError;
      currentUsage = newUsage;
    }

    // Check if user has exceeded demo limit
    if (currentUsage.messages_sent >= currentUsage.max_messages) {
      console.log("[DEMO-CHAT] Demo limit exceeded", { sessionId });
      return new Response(
        JSON.stringify({ 
          error: "Demo limit exceeded",
          message: "You've used your free demo messages. Sign up to continue using CriderGPT with unlimited access! 🚀"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429
        }
      );
    }

    let demoResponse = "";

    // Try to use Lovable AI for real responses
    if (LOVABLE_API_KEY) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: DEMO_SYSTEM_PROMPT },
              { role: 'user', content: message }
            ],
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          demoResponse = data.choices?.[0]?.message?.content || "";
          
          // Add demo reminder
          demoResponse += `\n\n---\n*This is a demo preview. Sign up for unlimited access to CriderGPT! 🌾*`;
        }
      } catch (aiError) {
        console.error("[DEMO-CHAT] AI error, using fallback:", aiError);
      }
    }

    // Fallback response if AI fails
    if (!demoResponse) {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes("farm") || lowerMessage.includes("crop") || lowerMessage.includes("agriculture")) {
        demoResponse = `Good question about farming! 🚜 

CriderGPT can help with soil health, crop planning, equipment maintenance, and more. This is a demo preview - sign up for full access to the complete agriculture AI that learns from your specific farm operation!

Ready to get started? 🌾`;
      } else if (lowerMessage.includes("weld") || lowerMessage.includes("metal")) {
        demoResponse = `Good welding question! ⚡

CriderGPT knows welding - electrodes, settings, joint prep, safety, and more. This demo gives you a preview. With a full account you get the welding calculator and detailed recommendations.

Ready to learn more? 🔥`;
      } else if (lowerMessage.includes("code") || lowerMessage.includes("python") || lowerMessage.includes("program")) {
        demoResponse = `Coding question, nice! 💻

CriderGPT can help with Python, TypeScript, web development, and more. Code blocks with copy buttons work in full version. Sign up for unlimited coding assistance!

Ready to code? 🚀`;
      } else {
        demoResponse = `Thanks for trying CriderGPT! 🤖

This demo shows what the AI can do. With full access you get unlimited conversations, calculators, guides, and AI that learns from your questions.

Built by Jessie Crider, FFA Historian 2025-2026. Ready to unlock full access? Sign up now! 🚀`;
      }
    }

    // Update demo usage
    await supabaseClient
      .from('demo_usage')
      .update({
        messages_sent: currentUsage.messages_sent + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    console.log("[DEMO-CHAT] Response generated successfully");

    return new Response(
      JSON.stringify({ 
        response: demoResponse,
        remaining_messages: Math.max(0, currentUsage.max_messages - (currentUsage.messages_sent + 1))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[DEMO-CHAT] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Demo service error",
        message: "Sorry, there was an issue. Please try again or sign up for full access."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
