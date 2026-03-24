import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_PRICES: Record<string, number> = {
  basic_glow: 5,
  animated_chrome: 10,
  full_custom: 20,
};

const LOYALTY_THRESHOLD = 3;
const LOYALTY_DISCOUNT_PERCENT = 15;

// Keywords that add complexity surcharges (server-side only — can't be gamed)
const COMPLEXITY_KEYWORDS: { pattern: RegExp; surcharge: number; label: string }[] = [
  { pattern: /\b(3d|three[\s-]?d(imensional)?)\b/i, surcharge: 5, label: "3D effects" },
  { pattern: /\b(face[\s-]?track(ing)?|face[\s-]?detect(ion)?)\b/i, surcharge: 4, label: "Face tracking" },
  { pattern: /\b(ar|augmented[\s-]?reality)\b/i, surcharge: 5, label: "AR features" },
  { pattern: /\b(particle(s)?[\s-]?(effect|system)?)\b/i, surcharge: 3, label: "Particle effects" },
  { pattern: /\b(multi[\s-]?face|group[\s-]?filter)\b/i, surcharge: 4, label: "Multi-face" },
  { pattern: /\b(world[\s-]?lens|ground[\s-]?track(ing)?)\b/i, surcharge: 5, label: "World lens" },
  { pattern: /\b(game|mini[\s-]?game|interactive[\s-]?game)\b/i, surcharge: 6, label: "Game mechanics" },
  { pattern: /\b(segmentation|body[\s-]?track(ing)?)\b/i, surcharge: 4, label: "Body segmentation" },
  { pattern: /\b(custom[\s-]?sound|audio|music)\b/i, surcharge: 2, label: "Custom audio" },
  { pattern: /\b(multiple[\s-]?scene|scene[\s-]?switch|tap[\s-]?to[\s-]?switch)\b/i, surcharge: 3, label: "Multi-scene" },
  { pattern: /\b(logo[\s-]?anim(ation)?|brand[\s-]?anim(ation)?)\b/i, surcharge: 3, label: "Logo animation" },
  { pattern: /\b(countdown|timer)\b/i, surcharge: 2, label: "Countdown/timer" },
  { pattern: /\b(quiz|trivia|random(izer)?)\b/i, surcharge: 3, label: "Quiz/randomizer" },
];

// BOGO: every 2nd order is free (applied as 100% discount on even orders)
const BOGO_INTERVAL = 2;

function analyzeDescription(description: string): { surcharge: number; reasons: string[] } {
  let surcharge = 0;
  const reasons: string[] = [];
  for (const kw of COMPLEXITY_KEYWORDS) {
    if (kw.pattern.test(description)) {
      surcharge += kw.surcharge;
      reasons.push(kw.label);
    }
  }
  // Cap the surcharge to prevent insane totals
  surcharge = Math.min(surcharge, 25);
  return { surcharge, reasons };
}

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
    const { order_id, customer_email, customer_name, filter_type, description } = body;

    logStep("Request parsed", { order_id, filter_type });

    if (!customer_email) throw new Error("Customer email is required");
    if (!filter_type || !TIER_PRICES[filter_type]) throw new Error("Invalid filter type");

    // Server-side price calculation — never trust client amount
    let basePrice = TIER_PRICES[filter_type];

    // Analyze description for complexity surcharges
    const descText = description || '';
    const { surcharge, reasons: complexityReasons } = analyzeDescription(descText);
    basePrice += surcharge;
    logStep("Complexity analysis", { surcharge, reasons: complexityReasons });

    let discount = 0;
    let discountReason: string | null = null;
    let isBogo = false;

    // Check loyalty discount and BOGO if we have a user
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

        const paidCount = count || 0;

        // BOGO: every 2nd order is free
        if (paidCount > 0 && (paidCount % BOGO_INTERVAL) === 1) {
          isBogo = true;
          discount = basePrice; // 100% off
          discountReason = `BOGO Free (order #${paidCount + 1})`;
          logStep("BOGO discount applied", { paidCount });
        } else if (paidCount >= LOYALTY_THRESHOLD) {
          // Loyalty discount (only if not BOGO)
          discount = +(basePrice * LOYALTY_DISCOUNT_PERCENT / 100).toFixed(2);
          discountReason = `Loyalty ${LOYALTY_DISCOUNT_PERCENT}% (${paidCount} orders)`;
          logStep("Loyalty discount applied", { paidCount, discount });
        }
      }
    }

    const finalPrice = +(basePrice - discount).toFixed(2);
    // BOGO orders are free — set minimum to $0 for those
    if (!isBogo && finalPrice < 1) throw new Error("Price calculation error");
    const amountCents = Math.max(Math.round(finalPrice * 100), isBogo ? 0 : 100);

    const origin = req.headers.get("origin") || "https://cridergpt.lovable.app";

    // If BOGO (free), skip Stripe and mark as paid directly
    if (isBogo && order_id) {
      await supabaseClient
        .from('filter_orders')
        .update({
          agreed_price: 0,
          discount_applied: basePrice,
          discount_reason: discountReason,
          payment_status: 'paid',
        })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({ 
          url: `${origin}/custom-filters?payment=success&order=${order_id}`,
          bogo: true,
          message: "BOGO — this one's on the house! 🎉"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

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
              description: complexityReasons.length > 0
                ? `Custom filter by CriderGPT (includes: ${complexityReasons.join(', ')})`
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
        complexity_surcharge: String(surcharge),
        complexity_reasons: complexityReasons.join(', '),
      },
      success_url: `${origin}/custom-filters?payment=success&order=${order_id || 'direct'}`,
      cancel_url: `${origin}/custom-filters?payment=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, finalPrice, surcharge });

    if (order_id) {
      await supabaseClient
        .from('filter_orders')
        .update({
          stripe_payment_id: session.id,
          agreed_price: finalPrice,
          discount_applied: discount,
          discount_reason: discountReason,
        })
        .eq('id', order_id);
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id, final_price: finalPrice, surcharge, complexity_reasons: complexityReasons }),
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
