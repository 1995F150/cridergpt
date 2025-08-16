
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all users to send notifications to
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .limit(1000); // Batch notifications

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create notifications for users (only if they haven't received one recently)
    const notifications = users?.map(user => ({
      user_id: user.user_id,
      notification_type: 'tiktok_follow',
      data: {
        username: username,
        message: `Follow @${username} on TikTok!`,
        url: `https://www.tiktok.com/@${username}`
      },
      read: false
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabaseClient
        .from('feature_notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        return new Response(
          JSON.stringify({ error: 'Failed to send notifications' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log(`Sent TikTok follow notifications to ${notifications.length} users for @${username}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications sent to ${notifications.length} users`,
        username: username 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-tiktok-follow-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
