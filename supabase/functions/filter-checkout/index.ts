import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FILTER-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { order_id, amount, customer_email, customer_name, filter_type, mode } = body;
    // mode: "checkout" = customer pays now, "payment_link" = admin generates link

    logStep("Request parsed", { order_id, amount, filter_type, mode });

    if (!amount || amount < 1) throw new Error("Invalid amount");
    if (!customer_email) throw new Error("Customer email is required");

    const origin = req.headers.get("origin") || "https://cridergpt.lovable.app";

    // Create a one-time Stripe Checkout session
    const amountCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customer_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Custom Snapchat Filter — ${formatFilterType(filter_type)}`,
              description: `Custom filter by CriderGPT for ${customer_name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: order_id || "direct",
        filter_type: filter_type || "custom",
        customer_name: customer_name || "",
      },
      success_url: `${origin}/custom-filters?payment=success&order=${order_id || 'direct'}`,
      cancel_url: `${origin}/custom-filters?payment=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // If we have an order_id, update the order with the stripe session info
    if (order_id) {
      await supabaseClient
        .from('filter_orders')
        .update({
          stripe_payment_id: session.id,
          agreed_price: amount,
          payment_status: 'pending',
        })
        .eq('id', order_id);
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function formatFilterType(type: string): string {
  const labels: Record<string, string> = {
    basic_glow: "Basic Glow / Aesthetic",
    animated_chrome: "Animated / Truck Chrome",
    full_custom: "Full Custom / Advanced",
  };
  return labels[type] || type || "Custom Filter";
}
