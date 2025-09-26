import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIFETIME-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Lifetime plan webhook started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { planName, userId, sessionId } = await req.json();
    logStep("Request parsed", { planName, userId, sessionId });

    if (planName === 'lifetime' && userId) {
      logStep("Processing lifetime plan purchase", { userId });

      // Increment the lifetime plan count
      const { data: config, error: fetchError } = await supabaseClient
        .from('lifetime_plan_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (fetchError || !config) {
        logStep("ERROR: Could not fetch lifetime config", fetchError);
        throw new Error("Could not fetch lifetime plan configuration");
      }

      // Check if we're still under the limit (double-check for race conditions)
      if (config.lifetime_plan_count >= config.max_lifetime_buyers) {
        logStep("ERROR: Attempting to purchase sold out plan", {
          current: config.lifetime_plan_count,
          max: config.max_lifetime_buyers
        });
        throw new Error("Lifetime plan is already sold out");
      }

      // Increment the count
      const { error: updateError } = await supabaseClient
        .from('lifetime_plan_config')
        .update({
          lifetime_plan_count: config.lifetime_plan_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (updateError) {
        logStep("ERROR: Failed to update lifetime count", updateError);
        throw updateError;
      }

      // Update user's plan to include lifetime access
      const { error: userUpdateError } = await supabaseClient
        .from('ai_usage')
        .upsert({
          user_id: userId,
          user_plan: 'lifetime',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (userUpdateError) {
        logStep("Warning: Failed to update user plan", userUpdateError);
      }

      // Add notification for lifetime purchase
      const { error: notificationError } = await supabaseClient
        .from('feature_notifications')
        .insert({
          user_id: userId,
          notification_type: 'lifetime_purchase',
          data: {
            message: 'Welcome to CriderGPT Lifetime Founder! You now have unlimited access to all features.',
            plan: 'lifetime',
            purchase_date: new Date().toISOString()
          }
        });

      if (notificationError) {
        logStep("Warning: Failed to create notification", notificationError);
      }

      logStep("Lifetime plan purchase processed successfully", {
        newCount: config.lifetime_plan_count + 1,
        remaining: config.max_lifetime_buyers - (config.lifetime_plan_count + 1)
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    logStep("ERROR in lifetime webhook", error);
    console.error("Lifetime webhook error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Webhook processing failed",
        message: (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});