import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[LIFETIME-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting lifetime checkout');
    
    const { priceId } = await req.json();
    if (!priceId) throw new Error('Price ID is required');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Stripe secret key not found');

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) throw new Error('User authentication failed');

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Check lifetime availability
    const { data: lifetimeConfig, error: configError } = await supabase
      .from('lifetime_plan_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !lifetimeConfig) throw new Error('Lifetime plan configuration not found');

    if (lifetimeConfig.lifetime_plan_count >= lifetimeConfig.max_lifetime_buyers) {
      throw new Error('Lifetime plan is sold out');
    }

    if (lifetimeConfig.promotion_end_date && new Date() > new Date(lifetimeConfig.promotion_end_date)) {
      throw new Error('Lifetime plan promotion has ended');
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get('origin') || 'https://cridergpt.lovable.app';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=lifetime`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        user_id: user.id,
        plan_name: 'lifetime',
        email: user.email || '',
      },
      allow_promotion_codes: true,
    });

    logStep('Checkout session created', { sessionId: checkoutSession.id });

    return new Response(
      JSON.stringify({ sessionUrl: checkoutSession.url, url: checkoutSession.url, sessionId: checkoutSession.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = (error as Error).message;
    logStep('Error', { error: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
