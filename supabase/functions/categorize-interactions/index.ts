import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorizedInteraction {
  user_input: string;
  ai_response: string;
  category: string;
  interaction_id: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user session for authorization
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    console.log('Starting interaction categorization process...');

    // Fetch all ai_interactions
    const { data: interactions, error: fetchError } = await supabaseClient
      .from('ai_interactions')
      .select('id, user_input, ai_response, created_at');

    if (fetchError) {
      console.error('Error fetching interactions:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${interactions.length} interactions...`);

    // Define target categories
    const targetCategories = [
      'Welding', 'Mechanics', 'History', 'CriderGPT', 'Coding', 
      'Engineering', 'Farming Simulator', 'Agriculture', 'Air Pressure'
    ];

    // Categorization logic
    const categorizeInteraction = (userInput: string, aiResponse: string): string | null => {
      const text = (userInput + ' ' + aiResponse).toLowerCase();
      
      // Check for each category with multiple keywords
      if (text.match(/weld|torch|metal|electrode|arc|mig|tig|flux|steel|iron/)) {
        return 'Welding';
      }
      if (text.match(/engine|motor|brake|transmission|oil|mechanic|repair|car|truck|vehicle|automotive/)) {
        return 'Mechanics';
      }
      if (text.match(/history|historical|war|battle|constitution|1812|past|century|historical/)) {
        return 'History';
      }
      if (text.match(/cridergpt|jessie|crider|gpt|ai|artificial intelligence|chat|bot/)) {
        return 'CriderGPT';
      }
      if (text.match(/code|coding|program|javascript|python|react|typescript|software|developer|api/)) {
        return 'Coding';
      }
      if (text.match(/engineering|design|build|construct|technical|structure|system|process/)) {
        return 'Engineering';
      }
      if (text.match(/farming simulator|fs22|fs25|mod|simulator|game|virtual farm/)) {
        return 'Farming Simulator';
      }
      if (text.match(/farm|agriculture|crop|cattle|livestock|soil|harvest|plant|seed|dairy|cow|pig|chicken/)) {
        return 'Agriculture';
      }
      if (text.match(/air pressure|pressure|pneumatic|compressor|psi|tire|inflation|vacuum/)) {
        return 'Air Pressure';
      }
      
      return null; // Exclude if doesn't fit categories
    };

    // Process and categorize interactions
    const categorizedData: CategorizedInteraction[] = [];
    const categoryCounts: Record<string, number> = {};

    interactions.forEach(interaction => {
      const category = categorizeInteraction(interaction.user_input, interaction.ai_response);
      
      if (category) { // Only include if it fits a category
        categorizedData.push({
          user_input: interaction.user_input,
          ai_response: interaction.ai_response,
          category,
          interaction_id: interaction.id,
          created_at: interaction.created_at
        });
        
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    console.log('Category distribution:', categoryCounts);
    console.log(`Categorized ${categorizedData.length} out of ${interactions.length} interactions`);

    // Create categorized_interactions table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.categorized_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        interaction_id UUID NOT NULL,
        user_input TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        categorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Enable RLS
      ALTER TABLE public.categorized_interactions ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for service role access
      CREATE POLICY IF NOT EXISTS "Service role can manage categorized interactions"
      ON public.categorized_interactions
      FOR ALL
      USING (true)
      WITH CHECK (true);
    `;

    // Execute table creation
    const { error: createError } = await supabaseClient.rpc('execute_sql', { 
      query: createTableQuery 
    });

    if (createError) {
      console.error('Error creating table:', createError);
      // Continue anyway, table might already exist
    }

    // Clear existing categorized data
    const { error: clearError } = await supabaseClient
      .from('categorized_interactions')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.log('Note: Could not clear existing data (table may not exist yet)');
    }

    // Insert categorized data in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < categorizedData.length; i += batchSize) {
      const batch = categorizedData.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from('categorized_interactions')
        .insert(batch.map(item => ({
          interaction_id: item.interaction_id,
          user_input: item.user_input,
          ai_response: item.ai_response,
          category: item.category,
          created_at: item.created_at
        })));

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }

    // Generate summary statistics
    const summary = {
      total_processed: interactions.length,
      total_categorized: categorizedData.length,
      excluded_count: interactions.length - categorizedData.length,
      category_distribution: categoryCounts,
      processing_timestamp: new Date().toISOString()
    };

    console.log('Final summary:', summary);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully categorized ${insertedCount} interactions`,
      summary,
      categories_found: Object.keys(categoryCounts).sort(),
      sample_data: categorizedData.slice(0, 3) // Show first 3 examples
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Categorization error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});