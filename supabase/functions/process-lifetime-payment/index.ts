import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // For lifetime plans, this is a one-time payment, not a subscription
    const planName = session.metadata?.planName || 'lifetime';
    const userId = session.metadata?.userId;
    const userEmail = session.customer_email || session.customer_details?.email;

    if (!userId) {
      throw new Error('User ID not found in session metadata');
    }

    console.log(`Processing lifetime payment for user ${userId}, email: ${userEmail}`);

    // Update user's plan to lifetime in ai_usage table
    const { error: usageError } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        user_plan: 'lifetime',
        email: userEmail,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (usageError) {
      console.error('Error updating ai_usage:', usageError);
      throw new Error(`Failed to update user plan: ${usageError.message}`);
    }

    // Update profiles table for frontend display
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        tier: 'lifetime',
        plus_access: true,
        pro_access: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error updating profiles:', profileError);
      // Don't throw error here, just log it
    }

    // Increment lifetime plan count
    const { data: currentConfig } = await supabase
      .from('lifetime_plan_config')
      .select('lifetime_plan_count')
      .eq('is_active', true)
      .single();

    const { error: configError } = await supabase
      .from('lifetime_plan_config')
      .update({
        lifetime_plan_count: (currentConfig?.lifetime_plan_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true);

    if (configError) {
      console.error('Error updating lifetime plan count:', configError);
    }

    // Create feature notification
    await supabase
      .from('feature_notifications')
      .insert({
        user_id: userId,
        notification_type: 'subscription_updated',
        data: {
          old_plan: 'free',
          new_plan: 'lifetime',
          features_unlocked: [
            'Unlimited tokens',
            'Unlimited TTS',
            'Unlimited projects',
            'Priority support',
            'All premium features'
          ]
        }
      });

    console.log(`Successfully processed lifetime payment for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: 'lifetime',
        email: userEmail 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing lifetime payment:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});