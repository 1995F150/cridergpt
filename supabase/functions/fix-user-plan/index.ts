import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    console.log(`Manually updating plan for user ${user.id} (${user.email}) to: ${plan}`);

    // Update the ai_usage table with correct user_id and email
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
      console.error('Failed to update user plan:', updateError);
      throw new Error(`Failed to update plan: ${updateError.message}`);
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
      console.error('Failed to send notification:', notificationError);
    }

    console.log(`Successfully updated plan for ${user.email} to ${plan}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Plan updated to ${plan} for ${user.email}`,
      user_id: user.id,
      new_plan: plan
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Manual plan fix error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});