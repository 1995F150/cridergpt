import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  id: string;
  email: string;
  full_name: string;
  username: string;
  created_at: string;
  last_sign_in_at: string;
  tier: string;
  tier_created_at: string;
  tokens_used: number;
  tts_requests: number;
  user_plan: string;
  pro_access: boolean;
  plus_access: boolean;
  subscription_status: string;
  stripe_customer_id: string;
  current_plan: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Google Sheets API key
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!googleSheetsApiKey) {
      throw new Error('Google Sheets API key not configured');
    }

    const { spreadsheetId, action } = await req.json();

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Fetch comprehensive user data from database using the existing function
    const { data: userData, error: userError } = await supabase.rpc('get_user_sync_data');

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw new Error('Failed to fetch user data');
    }

    console.log(`Found ${userData?.length || 0} users to sync`);

    // Prepare data for Google Sheets
    const headers = [
      'User ID', 'Email', 'Full Name', 'Username', 'Created At', 'Last Sign In', 
      'Tier', 'Tier Created', 'Tokens Used', 'TTS Requests', 'User Plan',
      'Pro Access', 'Plus Access', 'Subscription Status', 'Stripe Customer ID', 'Current Plan'
    ];

    const values = [
      headers,
      ...(userData || []).map((user: UserData) => [
        user.id || '',
        user.email || '',
        user.full_name || '',
        user.username || '',
        user.created_at || '',
        user.last_sign_in_at || '',
        user.tier || 'free',
        user.tier_created_at || '',
        user.tokens_used || 0,
        user.tts_requests || 0,
        user.user_plan || 'free',
        user.pro_access ? 'Yes' : 'No',
        user.plus_access ? 'Yes' : 'No',
        user.subscription_status || '',
        user.stripe_customer_id || '',
        user.current_plan || ''
      ])
    ];

    // Clear existing data and add new data
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:clear?key=${googleSheetsApiKey}`;
    
    console.log('Clearing existing sheet data...');
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!clearResponse.ok) {
      const clearError = await clearResponse.text();
      console.error('Error clearing sheet:', clearError);
      throw new Error(`Failed to clear sheet: ${clearError}`);
    }

    // Add new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?valueInputOption=RAW&key=${googleSheetsApiKey}`;
    
    console.log('Adding new data to sheet...');
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });

    if (!updateResponse.ok) {
      const updateError = await updateResponse.text();
      console.error('Error updating sheet:', updateError);
      throw new Error(`Failed to update sheet: ${updateError}`);
    }

    const result = await updateResponse.json();
    console.log('Successfully synced buyers to Google Sheets:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${userData?.length || 0} users to Google Sheets`,
        updatedCells: result.updatedCells || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-buyers-to-sheets function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})