import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEMO-CHAT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Demo chat function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, sessionId } = await req.json();
    logStep("Request parsed", { sessionId, messageLength: message?.length });

    if (!message || !sessionId) {
      throw new Error("Message and sessionId are required");
    }

    // Get client IP and user agent for tracking
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Check demo usage
    const { data: demoUsage, error: usageError } = await supabaseClient
      .from('demo_usage')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw usageError;
    }

    let currentUsage = demoUsage;
    
    if (!currentUsage) {
      // Create new demo usage record
      const { data: newUsage, error: createError } = await supabaseClient
        .from('demo_usage')
        .insert({
          session_id: sessionId,
          ip_address: ip,
          user_agent: userAgent,
          messages_sent: 0,
          max_messages: 1
        })
        .select()
        .single();

      if (createError) throw createError;
      currentUsage = newUsage;
    }

    // Check if user has exceeded demo limit
    if (currentUsage.messages_sent >= currentUsage.max_messages) {
      logStep("Demo limit exceeded", { sessionId, messagesSent: currentUsage.messages_sent });
      return new Response(
        JSON.stringify({ 
          error: "Demo limit exceeded",
          message: "You've used your free demo. Please sign up to continue using CriderGPT."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429
        }
      );
    }

    // Generate a simple demo response based on the message
    let demoResponse = "";
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("farm") || lowerMessage.includes("crop") || lowerMessage.includes("agriculture")) {
      demoResponse = `Good question about farming! 🚜 

First off, CriderGPT can help you with alot of farming stuff. I mean like:
• Soil health and what crops work best for your land
• Planning when to plant and rotate crops
• Keeping equipment running and fixing it when it breaks
• Weather decisions for planting and harvest
• Calculating livestock feed so you aint wasting money
• Farm budgeting and financial planning

This is just a demo so you can see what CriderGPT does. When you sign up for full access you get the whole agriculture AI that learns from your specific farm operation and gives you recommendations based on your location, crops, and equipment you got.

In the country you can farm and do better work that pays more. CriderGPT helps make sure youre doing it right. Ready to get started? 🌾`;
    } else if (lowerMessage.includes("weld") || lowerMessage.includes("metal") || lowerMessage.includes("steel")) {
      demoResponse = `Good welding question! ⚡

In the country you can weld things and repair farm equipment. CriderGPT knows welding because thats important for fixing things that break. Well, like:
• What electrode to use for different metals
• Getting the right amperage and voltage settings
• How to prep joints properly
• Safety gear and protocols so you dont get hurt
• Fixing weld defects when something dont look right
• Keeping your equipment maintained

This demo gives you a preview of the welding knowledge base. With a full account you get access to the welding calculator, safety checklists, and recommendations for your specific projects.

Fixing things yourself saves alot of money instead of paying someone else to do it. I mean thats just smart. Ready to learn more? 🔥`;
    } else if (lowerMessage.includes("truck") || lowerMessage.includes("engine") || lowerMessage.includes("vehicle")) {
      demoResponse = `Good automotive question! 🚗

CriderGPT can help with trucks and vehicles. Like:
• Figuring out whats wrong with your engine
• Keeping up with maintenance schedules
• Finding the right parts you need
• Getting better fuel efficiency
• Safety inspections
• Estimating repair costs

This is a preview of the automotive stuff. With full access you get detailed vehicle maintenance logs, diagnostic tools, and AI recommendations for your specific vehicles and how you use them.

In the country trucks are important for hauling equipment and getting work done. You gotta keep them running good, you know? Ready to get started? 🔧`;
    } else {
      demoResponse = `Thanks for trying CriderGPT! 🤖

This demo shows you what the AI can do. I mean, with a full account you get:

✅ Unlimited AI conversations
✅ Agriculture calculators and planning tools
✅ Welding guides and safety stuff
✅ Vehicle maintenance tracking
✅ FFA project help
✅ Financial planning tools
✅ Document generation
✅ And alot more!

The AI learns from your questions to give you better answers for your farming, welding, and mechanical projects. Thats kinda the point.

CriderGPT was built by Jessie Crider, FFA Historian for 2025-2026 from Southwest Virginia. Its designed to help people with real country life problems and FFA work.

Ready to unlock the full version of CriderGPT? Sign up now! 🚀`;
    }

    // Update demo usage
    const { error: updateError } = await supabaseClient
      .from('demo_usage')
      .update({
        messages_sent: currentUsage.messages_sent + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (updateError) {
      logStep("Warning: Failed to update demo usage", updateError);
    }

    logStep("Demo response generated successfully", { sessionId, responseLength: demoResponse.length });

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
    logStep("Error in demo chat", error);
    console.error("Demo chat error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Demo service error",
        message: "Sorry, there was an issue with the demo. Please try again or sign up for full access."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});