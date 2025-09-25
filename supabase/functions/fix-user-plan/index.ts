import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client with user's token to get their info
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Set the user's session
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { plan } = await req.json();
    
    if (!plan || !['free', 'plus', 'pro'].includes(plan)) {
      throw new Error('Invalid plan. Must be: free, plus, or pro');
    }

    console.log(`🔧 Manually updating plan for user ${user.id} (${user.email}) to: ${plan}`);

    // Update the user_subscriptions table (primary source)
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        email: user.email,
        plan_name: plan,
        plan_status: 'active',
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          manual_update: true,
          updated_by: 'manual_fix_function',
          timestamp: new Date().toISOString()
        }
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (subscriptionError) {
      console.error('❌ Failed to update user subscription:', subscriptionError);
      throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
    }

    console.log(`✅ Updated user_subscriptions table for user ${user.id}`);

    // Also update the ai_usage table for backward compatibility
    const { error: updateError } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: user.id,
        email: user.email, // Store actual email, not UUID
        user_plan: plan,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (updateError) {
      console.error('⚠️ Failed to update ai_usage (non-critical):', updateError);
    } else {
      console.log(`✅ Updated ai_usage table for backward compatibility`);
    }

    // Send notification for real-time update
    const { error: notificationError } = await supabase
      .from('feature_notifications')
      .insert({
        user_id: user.id,
        notification_type: 'subscription_updated',
        data: {
          new_plan: plan,
          manual_update: true,
          timestamp: new Date().toISOString()
        }
      });

    if (notificationError) {
      console.error('⚠️ Failed to send notification:', notificationError);
    } else {
      console.log(`📢 Sent real-time notification for plan update`);
    }

    console.log(`🎉 Successfully updated plan for ${user.email} to ${plan}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Plan updated to ${plan} for ${user.email}`,
      user_id: user.id,
      new_plan: plan,
      updated_tables: ['user_subscriptions', 'ai_usage']
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Manual plan fix error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});