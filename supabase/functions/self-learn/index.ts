import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization');
    
    // Create admin client for data operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role if auth header present
    if (authHeader?.startsWith('Bearer ')) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userId = claims.claims.sub;
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Fetch up to 20 pending items
    const { data: pendingItems, error: fetchErr } = await supabase
      .from('learning_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!pendingItems || pendingItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending items to learn', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        // Mark as processing
        await supabase.from('learning_queue').update({ status: 'processing' }).eq('id', item.id);

        // Research via AI gateway
        let learnedData = '';
        
        if (lovableApiKey) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'You are a knowledge research assistant for CriderGPT. Provide comprehensive, factual, well-structured summaries. Focus on practical information that would help an AI assistant answer questions about this topic in the future. Use bullet points and clear sections.'
                },
                {
                  role: 'user',
                  content: `Research and provide a comprehensive summary about: ${item.topic}\n\nContext of the knowledge gap: ${item.gap_description || 'No additional context'}`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            learnedData = aiData.choices?.[0]?.message?.content || '';
          } else {
            console.error('AI gateway error for item', item.id, aiResponse.status);
            learnedData = `[AI Gateway error: ${aiResponse.status}] Could not research this topic automatically.`;
          }
        } else {
          learnedData = '[No LOVABLE_API_KEY configured] Manual research required.';
        }

        // Store in training corpus
        if (learnedData && !learnedData.startsWith('[')) {
          await supabase.from('cridergpt_training_corpus').insert({
            content: learnedData,
            source_table: 'learning_queue',
            source_id: item.id,
            category: 'self-learned',
            topic: item.topic?.substring(0, 200),
          });
        }

        // Update queue item
        await supabase.from('learning_queue').update({
          status: 'learned',
          learned_data: learnedData?.substring(0, 5000),
          resolved_at: new Date().toISOString(),
        }).eq('id', item.id);

        processed++;
      } catch (itemErr) {
        console.error('Error processing item', item.id, itemErr);
        await supabase.from('learning_queue').update({ status: 'pending' }).eq('id', item.id);
        failed++;
      }
    }

    // Log to system_logs if table exists
    try {
      await supabase.from('system_logs').insert({
        action: 'self_learn_cycle',
        details: { processed, failed, total: pendingItems.length },
      });
    } catch { /* system_logs may not exist */ }

    return new Response(JSON.stringify({
      message: `Learning cycle complete`,
      processed,
      failed,
      total: pendingItems.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Self-learn error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
