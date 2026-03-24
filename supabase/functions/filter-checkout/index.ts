import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_PRICES: Record<string, number> = {
  basic_glow: 5,
  animated_chrome: 10,
  full_custom: 20,
};

const LOYALTY_THRESHOLD = 3;
const LOYALTY_DISCOUNT_PERCENT = 15;

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
    const { order_id, customer_email, customer_name, filter_type } = body;

    logStep("Request parsed", { order_id, filter_type });

    if (!customer_email) throw new Error("Customer email is required");
    if (!filter_type || !TIER_PRICES[filter_type]) throw new Error("Invalid filter type");

    // Server-side price calculation — never trust client amount
    let basePrice = TIER_PRICES[filter_type];
    let discount = 0;
    let discountReason: string | null = null;

    // Check loyalty discount if we have an order with a user_id
    if (order_id) {
      const { data: order } = await supabaseClient
        .from('filter_orders')
        .select('user_id')
        .eq('id', order_id)
        .single();

      if (order?.user_id) {
        const { count } = await supabaseClient
          .from('filter_orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', order.user_id)
          .eq('payment_status', 'paid');

        if ((count || 0) >= LOYALTY_THRESHOLD) {
          discount = +(basePrice * LOYALTY_DISCOUNT_PERCENT / 100).toFixed(2);
          discountReason = `Loyalty ${LOYALTY_DISCOUNT_PERCENT}% (${count} orders)`;
          logStep("Loyalty discount applied", { count, discount });
        }
      }
    }

    const finalPrice = +(basePrice - discount).toFixed(2);
    if (finalPrice < 1) throw new Error("Price calculation error");

    const origin = req.headers.get("origin") || "https://cridergpt.lovable.app";
    const amountCents = Math.round(finalPrice * 100);

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
              description: discount > 0
                ? `Custom filter by CriderGPT for ${customer_name} (${LOYALTY_DISCOUNT_PERCENT}% loyalty discount applied)`
                : `Custom filter by CriderGPT for ${customer_name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: order_id || "direct",
        filter_type: filter_type,
        customer_name: customer_name || "",
        discount: String(discount),
      },
      success_url: `${origin}/custom-filters?payment=success&order=${order_id || 'direct'}`,
      cancel_url: `${origin}/custom-filters?payment=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, finalPrice });

    if (order_id) {
      await supabaseClient
        .from('filter_orders')
        .update({
          stripe_payment_id: session.id,
          agreed_price: finalPrice,
          discount_applied: discount,
          discount_reason: discountReason,
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
