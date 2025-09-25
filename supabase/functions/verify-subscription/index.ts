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
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0].price.id;
    
    // Determine plan based on price
    let planName = 'free';
    if (priceId === 'price_1QWi0fIJp5CmkQf3fE8NSFZE') { // Replace with your actual Plus price ID
      planName = 'plus';
    } else if (priceId === 'price_1QWi1AIJp5CmkQf3Y8wQEP2V') { // Replace with your actual Pro price ID
      planName = 'pro';
    }

    // Update user plan in ai_usage table
    const { data, error } = await supabase
      .from('ai_usage')
      .update({ 
        user_plan: planName,
        updated_at: new Date().toISOString()
      })
      .eq('email', session.customer_email)
      .select();

    if (error) {
      console.error('Database update error:', error);
      throw new Error(`Failed to update user plan: ${error.message}`);
    }

    // Also update by user_id if available in metadata
    if (session.metadata?.userId) {
      await supabase
        .from('ai_usage')
        .update({ 
          user_plan: planName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.metadata.userId);
    }

    console.log(`Successfully updated user plan to ${planName} for ${session.customer_email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: planName,
        email: session.customer_email 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});