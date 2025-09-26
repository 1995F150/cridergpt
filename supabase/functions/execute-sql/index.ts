import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query } = await req.json();
    
    console.log('Executing SQL query:', query);

    // For security, only allow certain types of queries
    const cleanQuery = query.trim().toLowerCase();
    
    if (cleanQuery.startsWith('select')) {
      // Read operations
      const { data, error } = await supabase.rpc('get_query_result', { 
        query_text: query 
      });
      
      if (error) {
        console.error('SQL error:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data,
        rowCount: data?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (cleanQuery.startsWith('insert') || cleanQuery.startsWith('update') || cleanQuery.startsWith('delete')) {
      // Write operations - execute directly with service role
      const { data, error } = await supabase.rpc('execute_admin_query', { 
        query_text: query 
      });
      
      if (error) {
        console.error('SQL error:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Query executed successfully',
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Only SELECT, INSERT, UPDATE, and DELETE queries are allowed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in execute-sql function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});