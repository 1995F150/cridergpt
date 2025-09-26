import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[${new Date().toISOString()}] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting lifetime checkout process');
    
    const { priceId } = await req.json();
    logStep('Received request', { priceId });

    if (!priceId) {
      throw new Error('Price ID is required');
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      logStep('User authentication failed', userError);
      throw new Error('User authentication failed');
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Check lifetime plan availability
    const { data: lifetimeConfig, error: configError } = await supabase
      .from('lifetime_plan_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !lifetimeConfig) {
      throw new Error('Lifetime plan configuration not found');
    }

    logStep('Lifetime config loaded', lifetimeConfig);

    // Check if lifetime plan is still available
    const slotsRemaining = lifetimeConfig.max_lifetime_buyers - lifetimeConfig.lifetime_plan_count;
    if (slotsRemaining <= 0) {
      throw new Error('Lifetime plan is sold out');
    }

    // Check if promotion has ended
    if (lifetimeConfig.promotion_end_date) {
      const endDate = new Date(lifetimeConfig.promotion_end_date);
      const now = new Date();
      if (now > endDate) {
        throw new Error('Lifetime plan promotion has ended');
      }
    }

    // Check for existing Stripe customer
    let stripeCustomerId: string;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
      logStep('Using existing customer', { stripeCustomerId });
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      logStep('Created new customer', { stripeCustomerId });

      // Save customer to database
      await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          email: user.email,
        });
    }

    // Create one-time payment checkout session for lifetime plan
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment', // Changed from 'subscription' to 'payment' for one-time purchase
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}&plan=lifetime`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      metadata: {
        user_id: user.id,
        plan_name: 'lifetime',
        email: user.email || '',
      },
      allow_promotion_codes: true,
    });

    logStep('Checkout session created', { 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });

    return new Response(
      JSON.stringify({ 
        sessionUrl: checkoutSession.url,
        sessionId: checkoutSession.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('Error in lifetime checkout', { error: (error as Error).message });
    console.error('Lifetime checkout error:', error);
    
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});