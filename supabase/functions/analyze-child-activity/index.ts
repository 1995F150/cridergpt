import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activityLogId, content, guardianIds } = await req.json();

    if (!content || !activityLogId || !guardianIds?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AI Safety Analysis Prompt
    const systemPrompt = `You are a child safety AI assistant. Your job is to analyze content from a minor user and assess its safety level.

ANALYZE THE FOLLOWING CONTENT AND RESPOND WITH VALID JSON ONLY:
{
  "safety_score": <number 1-100, where 100 is completely safe>,
  "flags": [<array of concern flags if any>],
  "severity": "<'safe' | 'review' | 'warning' | 'critical'>",
  "explanation": "<brief explanation if score < 80>"
}

CONCERN FLAGS TO DETECT:
- "bullying" - Signs of being bullied or bullying others
- "depression" - Signs of depression or hopelessness
- "self_harm" - Any mention of self-harm
- "violence" - Violent content or threats
- "inappropriate_content" - Adult or inappropriate topics
- "stranger_danger" - Sharing personal info or talking to strangers
- "substance_use" - References to drugs or alcohol
- "academic_dishonesty" - Cheating or plagiarism

SCORING GUIDELINES:
- 90-100: Completely safe, normal conversation
- 70-89: Minor concerns, may warrant review
- 50-69: Moderate concerns, guardian should be notified
- 30-49: Serious concerns, requires attention
- 1-29: Critical safety issue, immediate attention needed

Be protective but not overly sensitive. Normal teenage conversation should score 85+.`;

    // Call AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this content from a child user:\n\n"${content}"` }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', await aiResponse.text());
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let analysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = { safety_score: 85, flags: [], severity: 'safe' };
    }

    const { safety_score, flags, severity, explanation } = analysis;

    // Update activity log with AI analysis
    await supabase
      .from('child_activity_logs')
      .update({
        ai_safety_score: safety_score,
        ai_flags: flags || []
      })
      .eq('id', activityLogId);

    // Create alerts for concerning content
    if (severity !== 'safe' && safety_score < 80) {
      // Get child_id from activity log
      const { data: activityLog } = await supabase
        .from('child_activity_logs')
        .select('child_id')
        .eq('id', activityLogId)
        .single();

      if (activityLog) {
        // Create alert for each guardian
        const alertPromises = guardianIds.map((guardianId: string) => 
          supabase.from('guardian_alerts').insert({
            guardian_id: guardianId,
            child_id: activityLog.child_id,
            alert_type: 'content_warning',
            severity: severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info',
            title: `Safety Alert: ${flags?.[0] || 'Content Concern'}`,
            description: explanation || `Safety score: ${safety_score}/100`,
            activity_log_id: activityLogId
          })
        );

        await Promise.all(alertPromises);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        safety_score, 
        flags,
        severity 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-child-activity:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
