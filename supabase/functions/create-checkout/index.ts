import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY is not set");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const { priceId, planName } = await req.json();
    logStep("Request body parsed", { priceId, planName });
    
    if (!priceId) {
      logStep("ERROR: Price ID is required");
      throw new Error("Price ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    logStep("Stripe client initialized");

    // Initialize Supabase client for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check lifetime plan availability if this is a lifetime purchase
    if (planName === 'lifetime') {
      const { data: lifetimeConfig, error: configError } = await supabaseClient
        .from('lifetime_plan_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (configError || !lifetimeConfig) {
        logStep("ERROR: Could not fetch lifetime plan config");
        throw new Error("Lifetime plan configuration not found");
      }

      if (lifetimeConfig.lifetime_plan_count >= lifetimeConfig.max_lifetime_buyers) {
        logStep("ERROR: Lifetime plan sold out", { 
          current: lifetimeConfig.lifetime_plan_count, 
          max: lifetimeConfig.max_lifetime_buyers 
        });
        throw new Error("Lifetime Founder Plan is sold out. Thanks to our 35 early supporters!");
      }

      if (lifetimeConfig.promotion_end_date) {
        const endDate = new Date(lifetimeConfig.promotion_end_date);
        const now = new Date();
        if (now > endDate) {
          logStep("ERROR: Lifetime plan promotion ended");
          throw new Error("Lifetime Founder Plan promotion has ended");
        }
      }

      logStep("Lifetime plan availability confirmed", {
        slots_remaining: lifetimeConfig.max_lifetime_buyers - lifetimeConfig.lifetime_plan_count
      });
    }

    // Get authenticated user
    logStep("Authenticating user");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or no email");
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if customer already exists
    logStep("Checking for existing Stripe customer");
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer found");
    }

    // Get origin for URLs
    const origin = req.headers.get("origin") || "https://your-app.lovable.app";
    logStep("Setting up checkout session", { origin });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        userId: user.id,
        planName: planName || 'unknown',
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      payment_method_collection: "always",
    });

    logStep("Checkout session created successfully", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});