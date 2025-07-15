import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Create checkout function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Reading request body...");
    const { priceId } = await req.json();
    console.log("Price ID received:", priceId);
    
    if (!priceId) {
      console.error("Price ID is missing");
      throw new Error("Price ID is required");
    }

    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Getting user from token...");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      console.error("User authentication error:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = data.user;
    console.log("User authenticated:", !!user, user?.email);
    
    if (!user?.email) {
      console.error("User not authenticated or no email");
      throw new Error("User not authenticated");
    }

    // Check if Stripe secret key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not found");
      throw new Error("Stripe configuration missing");
    }
    console.log("Stripe key found, length:", stripeKey.length);

    // Initialize Stripe
    console.log("Initializing Stripe...");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer already exists
    console.log("Checking for existing customer...");
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    console.log("Found customers:", customers.data.length);

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Using existing customer:", customerId);
    } else {
      console.log("No existing customer found");
    }

    // Create checkout session
    console.log("Creating checkout session...");
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
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        userId: user.id,
      },
    });

    console.log("Checkout session created:", session.id);
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack || "No stack trace available"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});