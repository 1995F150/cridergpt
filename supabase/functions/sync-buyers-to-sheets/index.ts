import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BuyerData {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  stripe_customer_id: string;
  subscription_status: string;
  total_purchases: number;
  last_purchase_date: string;
  created_at: string;
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

    // Fetch buyers data from database
    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('*')
      .order('created_at', { ascending: false });

    if (buyersError) {
      console.error('Error fetching buyers:', buyersError);
      throw new Error('Failed to fetch buyers data');
    }

    console.log(`Found ${buyers?.length || 0} buyers to sync`);

    // Prepare data for Google Sheets
    const headers = [
      'ID', 'Email', 'Full Name', 'Phone', 'Stripe Customer ID', 
      'Subscription Status', 'Total Purchases', 'Last Purchase Date', 'Created At'
    ];

    const values = [
      headers,
      ...(buyers || []).map((buyer: BuyerData) => [
        buyer.id,
        buyer.email || '',
        buyer.full_name || '',
        buyer.phone || '',
        buyer.stripe_customer_id || '',
        buyer.subscription_status || '',
        buyer.total_purchases || 0,
        buyer.last_purchase_date || '',
        buyer.created_at || ''
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
        message: `Successfully synced ${buyers?.length || 0} buyers to Google Sheets`,
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