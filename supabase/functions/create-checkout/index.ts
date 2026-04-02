import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const { priceId, planName, quantity, action, shippingAddress, cartItems } = await req.json();
    logStep("Request body parsed", { priceId, planName, quantity, action });
    
    if (!priceId && !cartItems?.length) {
      throw new Error("Price ID or cart items are required");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check lifetime plan availability if applicable
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
        throw new Error("Lifetime Founder Plan is sold out.");
      }

      if (lifetimeConfig.promotion_end_date) {
        const endDate = new Date(lifetimeConfig.promotion_end_date);
        if (new Date() > endDate) {
          throw new Error("Lifetime Founder Plan promotion has ended");
        }
      }

      logStep("Lifetime plan availability confirmed");
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://cridergpt.lovable.app";

    const isTagOrder = action === 'tag-order';
    const isStoreOrder = action === 'store-order';
    const orderQuantity = isTagOrder ? (quantity || 1) : 1;

    // Build line items
    let lineItems;
    if (isStoreOrder && cartItems?.length) {
      // Multi-item store cart checkout
      lineItems = cartItems
        .filter((item: any) => item.stripe_price_id)
        .map((item: any) => ({
          price: item.stripe_price_id,
          quantity: item.quantity || 1,
        }));
      if (lineItems.length === 0) {
        throw new Error("No valid products in cart");
      }
    } else {
      lineItems = [{ price: priceId, quantity: orderQuantity }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: isTagOrder || isStoreOrder || planName === 'lifetime' ? "payment" : "subscription",
      line_items: lineItems,
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        userId: user.id,
        planName: planName || 'unknown',
        ...(isTagOrder && {
          action: 'tag-order',
          quantity: String(orderQuantity),
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
          customerName: shippingAddress?.fullName || undefined,
        }),
        ...(isStoreOrder && {
          action: 'store-order',
          cartItems: cartItems ? JSON.stringify(cartItems) : undefined,
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
        }),
      },
      allow_promotion_codes: true,
    });

    // DO NOT insert orders here — orders are created only after payment
    // is confirmed via the stripe-webhooks checkout.session.completed handler.

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
