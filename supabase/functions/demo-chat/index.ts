import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      demoResponse = `Great question about farming! 🚜 

CriderGPT can help you with:
• Soil health calculations and recommendations
• Crop planning and rotation strategies  
• Equipment maintenance schedules
• Weather-based planting decisions
• Livestock feed calculations
• Farm financial planning

This is just a demo response. Sign up for full access to our agriculture AI that learns from your specific farming operation and provides personalized recommendations based on your location, crops, and equipment.

Ready to unlock the full power of CriderGPT for your farm? 🌾`;
    } else if (lowerMessage.includes("weld") || lowerMessage.includes("metal") || lowerMessage.includes("steel")) {
      demoResponse = `Excellent welding question! ⚡

CriderGPT's welding expertise includes:
• Electrode selection for different metals
• Proper amperage and voltage settings
• Joint preparation techniques
• Safety protocols and PPE requirements
• Troubleshooting weld defects
• Equipment maintenance

This demo gives you a taste of our welding knowledge base. With a full account, you get access to our comprehensive welding calculator, safety checklists, and personalized recommendations for your specific projects.

Ready to take your welding skills to the next level? 🔥`;
    } else if (lowerMessage.includes("truck") || lowerMessage.includes("engine") || lowerMessage.includes("vehicle")) {
      demoResponse = `Great automotive question! 🚗

CriderGPT can assist with:
• Engine diagnostics and troubleshooting
• Maintenance scheduling
• Parts identification and sourcing
• Fuel efficiency optimization
• Safety inspections
• Repair cost estimates

This is a preview of our automotive expertise. With full access, you get detailed vehicle maintenance logs, diagnostic tools, and AI recommendations tailored to your specific vehicles and driving conditions.

Ready to keep your vehicles running smoothly? 🔧`;
    } else {
      demoResponse = `Thanks for trying CriderGPT! 🤖

This demo shows you a glimpse of what our AI can do. With a full account, you get:

✅ Unlimited AI conversations
✅ Agriculture calculators and planning tools
✅ Welding guides and safety protocols  
✅ Vehicle maintenance tracking
✅ FFA project management
✅ Financial planning tools
✅ Document generation
✅ And much more!

Our AI learns from your interactions to provide increasingly personalized and helpful responses for your farming, welding, and mechanical projects.

Ready to unlock the full potential of CriderGPT? Sign up now! 🚀`;
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