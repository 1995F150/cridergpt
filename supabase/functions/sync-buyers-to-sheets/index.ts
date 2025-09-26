import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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

// Google OAuth2 helper functions
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Create signature - fix private key format issue
  const textToSign = `${encodedHeader}.${encodedPayload}`;
  
  // Properly format the private key
  let privateKeyPem = serviceAccount.private_key;
  if (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')) {
    // Handle base64 encoded keys
    privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyPem}\n-----END PRIVATE KEY-----`;
  }
  
  // Clean up the PEM formatting
  privateKeyPem = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
  
  // Convert PEM to DER format for WebCrypto
  const pemLines = privateKeyPem.split('\n');
  const keyData = pemLines
    .filter((line: string) => !line.includes('-----'))
    .join('')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(textToSign)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${textToSign}.${encodedSignature}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting sync-buyers-to-sheets function...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const defaultSheetId = Deno.env.get('GOOGLE_SHEET_ID');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!serviceAccountJson) {
      throw new Error('Missing Google Service Account JSON');
    }

    console.log('Environment variables loaded successfully');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let spreadsheetId = defaultSheetId;
    try {
      const body = await req.json();
      if (body.spreadsheetId) {
        spreadsheetId = body.spreadsheetId;
      }
    } catch (e) {
      console.log('No JSON body provided, using default sheet ID');
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required (either in request body or environment variable)');
    }

    console.log(`Using spreadsheet ID: ${spreadsheetId}`);

    // Fetch user data directly from tables instead of using the problematic RPC
    console.log('Fetching user data from Supabase...');
    
    // Fetch auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    console.log(`Found ${authUsers?.users?.length || 0} auth users`);

    // Fetch profiles data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.log('Warning: Could not fetch profiles:', profilesError.message);
    }

    // Fetch usage data
    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage')
      .select('*');

    if (usageError) {
      console.log('Warning: Could not fetch usage data:', usageError.message);
    }

    // Combine data
    const userData = authUsers.users.map(user => {
      const profile = profiles?.find(p => p.user_id === user.id);
      const usage = usageData?.find(u => u.user_id === user.id);

      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        username: user.user_metadata?.username || '',
        created_at: user.created_at || '',
        last_sign_in_at: user.last_sign_in_at || '',
        tier: profile?.tier || 'free',
        tier_created_at: profile?.subscription_start_date || '',
        tokens_used: usage?.tokens_used || 0,
        tts_requests: usage?.tts_requests || 0,
        user_plan: usage?.user_plan || profile?.tier || 'free',
        pro_access: profile?.pro_access || false,
        plus_access: profile?.plus_access || false,
        subscription_status: profile?.stripe_subscription_status || '',
        stripe_customer_id: profile?.stripe_customer_id || '',
        current_plan: profile?.current_plan || ''
      };
    });

    console.log(`Processed ${userData.length} users for sync`);

    // Get Google access token
    console.log('Getting Google access token...');
    const accessToken = await getGoogleAccessToken(serviceAccountJson);
    console.log('Successfully obtained Google access token');

    // Prepare data for Google Sheets
    const headers = [
      'User ID', 'Email', 'Full Name', 'Username', 'Created At', 'Last Sign In', 
      'Tier', 'Tier Created', 'Tokens Used', 'TTS Requests', 'User Plan',
      'Pro Access', 'Plus Access', 'Subscription Status', 'Stripe Customer ID', 'Current Plan'
    ];

    const values = [
      headers,
      ...userData.map((user: any) => [
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

    // Clear existing data
    console.log('Clearing existing sheet data...');
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:clear`;
    
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!clearResponse.ok) {
      const clearError = await clearResponse.text();
      console.error('Error clearing sheet:', clearError);
      throw new Error(`Failed to clear sheet: ${clearError}`);
    }

    console.log('Sheet cleared successfully');

    // Add new data
    console.log('Adding new data to sheet...');
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?valueInputOption=RAW`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
    console.log('Successfully synced users to Google Sheets:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${userData.length} users to Google Sheets`,
        updatedCells: result.updatedCells || 0,
        usersProcessed: userData.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-buyers-to-sheets function:', error);
    console.error('Stack trace:', (error as Error).stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Unknown error occurred',
        details: (error as Error).stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})