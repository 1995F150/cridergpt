import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("🔍 Verifying session:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase with service role key for database updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("📦 Session mode:", session.mode, "| Payment status:", session.payment_status);
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    let planName = 'free';
    const userId = session.metadata?.userId;
    const email = session.customer_email;

    // Handle one-time payments (lifetime) vs subscriptions
    if (session.mode === 'payment') {
      // One-time payment - check metadata for plan name
      planName = session.metadata?.planName || 'lifetime';
      console.log("💎 One-time payment detected, plan:", planName);

      if (planName === 'lifetime') {
        // Increment lifetime plan count
        const { data: config, error: configError } = await supabase
          .from('lifetime_plan_config')
          .select('*')
          .eq('is_active', true)
          .single();

        if (!configError && config) {
          await supabase
            .from('lifetime_plan_config')
            .update({ 
              lifetime_plan_count: (config.lifetime_plan_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.id);
          console.log("📊 Incremented lifetime plan count");
        }
      }
    } else if (session.mode === 'subscription') {
      // Subscription payment - get plan from price ID
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0].price.id;
      console.log("📋 Subscription price ID:", priceId);
      
      // Map price IDs to plan names
      if (priceId === 'price_1QWi0fIJp5CmkQf3fE8NSFZE') {
        planName = 'plus';
      } else if (priceId === 'price_1QWi1AIJp5CmkQf3Y8wQEP2V') {
        planName = 'pro';
      }
    }

    console.log("🎯 Final plan name:", planName, "| User ID:", userId, "| Email:", email);

    // Update user plan in ai_usage table by email
    if (email) {
      const { error: emailError } = await supabase
        .from('ai_usage')
        .update({ 
          user_plan: planName,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (emailError) {
        console.error('❌ Email update error:', emailError);
      } else {
        console.log("✅ Updated ai_usage by email:", email);
      }
    }

    // Also update by user_id if available
    if (userId) {
      const { error: userIdError } = await supabase
        .from('ai_usage')
        .update({ 
          user_plan: planName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (userIdError) {
        console.error('❌ User ID update error:', userIdError);
      } else {
        console.log("✅ Updated ai_usage by user_id:", userId);
      }

      // Update profiles table for lifetime users
      if (planName === 'lifetime') {
        await supabase
          .from('profiles')
          .update({ 
            tier: 'lifetime',
            lifetime_access: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        console.log("✅ Updated profiles for lifetime user");
      }
    }

    console.log(`🎉 Successfully verified and updated user plan to ${planName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: planName,
        email: email,
        mode: session.mode
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error verifying subscription:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});