import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use the service role key to perform writes (upsert) in Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("ai_usage").upsert({
        email: user.email,
        user_id: user.id,
        user_plan: 'free',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      return new Response(JSON.stringify({ plan: 'free', subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let userPlan = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      logStep("Active subscription found", { subscriptionId: subscription.id });
      
      // Determine plan from price
      const priceId = subscription.items.data[0].price.id;
      logStep("Processing price ID", { priceId });
      
      if (priceId === 'price_1QWi0fIJp5CmkQf3fE8NSFZE') {
        userPlan = 'plus';
      } else if (priceId === 'price_1QWi1AIJp5CmkQf3Y8wQEP2V') {
        userPlan = 'pro';
      }
      
      logStep("Determined user plan", { userPlan });
    } else {
      logStep("No active subscription found");
    }

    // Update ai_usage table with the correct plan
    await supabaseClient.from("ai_usage").upsert({
      email: user.email,
      user_id: user.id,
      user_plan: userPlan,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Send feature notification if plan changed
    if (userPlan !== 'free') {
      await supabaseClient.from("feature_notifications").insert({
        user_id: user.id,
        notification_type: 'subscription_updated',
        data: { new_plan: userPlan },
        read: false,
      });
    }

    logStep("Updated database with subscription info", { plan: userPlan, subscribed: hasActiveSub });
    return new Response(JSON.stringify({
      plan: userPlan,
      subscribed: hasActiveSub
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});