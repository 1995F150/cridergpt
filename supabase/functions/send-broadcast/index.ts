import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BroadcastRequest {
  targetAudience: 'all' | 'free' | 'plus' | 'pro' | 'lifetime';
  subject: string;
  body: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetAudience, subject, body }: BroadcastRequest = await req.json();

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Subject and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting broadcast to audience: ${targetAudience}`);

    // Fetch user emails based on target audience
    let query = supabase
      .from('profiles')
      .select('user_id');

    if (targetAudience !== 'all') {
      query = query.eq('current_plan', targetAudience);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No recipients found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user emails from auth.users
    const userIds = profiles.map(p => p.user_id);
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const targetEmails = users.users
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!);

    console.log(`Found ${targetEmails.length} emails to send`);

    // Insert broadcast history record
    const { data: historyRecord, error: historyError } = await supabase
      .from('broadcast_history')
      .insert({
        subject,
        body,
        target_audience: targetAudience,
        recipients_count: targetEmails.length,
        status: 'pending',
        sent_by: user.id
      })
      .select()
      .single();

    if (historyError) {
      console.error('Error creating history record:', historyError);
    }

    // Send emails via Resend (batch up to 100 at a time)
    let successCount = 0;
    let failCount = 0;

    // Resend has batch limits, send in chunks
    const BATCH_SIZE = 50;
    for (let i = 0; i < targetEmails.length; i += BATCH_SIZE) {
      const batch = targetEmails.slice(i, i + BATCH_SIZE);
      
      try {
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            batch.map(email => ({
              from: 'CriderGPT <noreply@cridergpt.com>',
              to: email,
              subject: subject,
              text: body,
              html: body.replace(/\n/g, '<br>')
            }))
          ),
        });

        if (response.ok) {
          successCount += batch.length;
          console.log(`Sent batch of ${batch.length} emails`);
        } else {
          const errorData = await response.text();
          console.error('Resend error:', errorData);
          failCount += batch.length;
        }
      } catch (batchError) {
        console.error('Batch send error:', batchError);
        failCount += batch.length;
      }
    }

    // Update history record status
    if (historyRecord) {
      await supabase
        .from('broadcast_history')
        .update({ 
          status: failCount === 0 ? 'sent' : (successCount > 0 ? 'partial' : 'failed'),
          recipients_count: successCount
        })
        .eq('id', historyRecord.id);
    }

    console.log(`Broadcast complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        message: `Broadcast sent to ${successCount} recipients` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-broadcast:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
