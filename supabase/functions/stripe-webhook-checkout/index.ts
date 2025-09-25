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
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verify webhook signature
    const endpointSecret = Deno.env.get("STRIPE_CHECKOUT_SESSION_COMPLETED_WEBHOOK_SECRET");
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret || "");

    console.log(`Processing webhook event: ${event.type} for ${event.data.object.customer_email}`);

    // Initialize Supabase with service role key for database updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle both subscription and one-time payments from payment links
      if (session.customer_email) {
        let planName = 'free';
        
        if (session.mode === "subscription" && session.subscription) {
          // Get subscription details to determine plan
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0].price.id;
          
          // Map price ID to plan name
          if (priceId === 'price_1Rell1P90uC07RqG5S4mEjHC') { // Plus plan
            planName = 'plus';
          } else if (priceId === 'price_1RellmP90uC07RqGFSDHaCwu') { // Pro plan
            planName = 'pro';
          }
        } else if (session.mode === "payment") {
          // Handle one-time payment links - determine plan by amount or line items
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const amount = lineItems.data[0]?.amount_total || 0;
          
          // Map amount to plan (adjust these amounts to match your pricing)
          if (amount >= 2099) { // $20.99 or higher = Pro
            planName = 'pro';
          } else if (amount >= 999) { // $9.99 or higher = Plus
            planName = 'plus';
          }
        }

        console.log(`Updating plan to: ${planName} for ${session.customer_email}`);

        // Update ai_usage table with subscription info
        const { data: aiUsageData, error: aiUsageError } = await supabase
          .from('ai_usage')
          .update({
            user_plan: planName,
            updated_at: new Date().toISOString()
          })
          .eq('email', session.customer_email)
          .select();

        if (aiUsageError) {
          console.error('Error updating ai_usage:', aiUsageError);
        } else {
          console.log('Successfully updated ai_usage for:', session.customer_email);
        }

        // Update or insert customer record
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .upsert({
            stripe_customer_id: session.customer as string,
            email: session.customer_email,
            user_id: session.metadata?.userId || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stripe_customer_id'
          });

        if (customerError) {
          console.error('Error updating customers:', customerError);
        } else {
          console.log('Updated customer record for:', session.customer);
        }

        // If we have userId in metadata, also update by user_id
        if (session.metadata?.userId) {
          await supabase
            .from('ai_usage')
            .update({
              user_plan: planName,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', session.metadata.userId);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});