import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const AGENT_ROLES = [
  { role: 'researcher', label: '🔍 Researcher', prompt: 'You are a research agent. Find facts, data, and evidence related to the objective. Be thorough and cite specifics.' },
  { role: 'writer', label: '✍️ Writer', prompt: 'You are a writing agent. Draft clear, engaging content based on the objective. Match a natural human voice — no AI cliches.' },
  { role: 'coder', label: '💻 Coder', prompt: 'You are a coding agent. Write clean, working code solutions. Include comments and handle edge cases.' },
  { role: 'analyst', label: '📊 Analyst', prompt: 'You are a data analyst agent. Break down numbers, find patterns, and provide actionable insights.' },
  { role: 'critic', label: '🎯 Critic', prompt: 'You are a quality control agent. Review work from other agents, find flaws, and suggest improvements.' },
  { role: 'planner', label: '📋 Planner', prompt: 'You are a planning agent. Break the objective into actionable steps with timelines and priorities.' },
  { role: 'creative', label: '🎨 Creative', prompt: 'You are a creative agent. Generate innovative ideas, brainstorm solutions, and think outside the box.' },
  { role: 'ffa_expert', label: '🌾 FFA Expert', prompt: 'You are an FFA and agriculture expert agent. Provide knowledge on SAE projects, record books, CDEs, and ag science.' },
  { role: 'livestock', label: '🐄 Livestock', prompt: 'You are a livestock management agent. Track animals, health records, feed ratios, and breeding schedules.' },
  { role: 'mechanic', label: '🔧 Mechanic', prompt: 'You are a farm equipment and vehicle mechanic agent. Diagnose issues, suggest repairs, and provide maintenance schedules.' },
  { role: 'financial', label: '💰 Financial', prompt: 'You are a financial agent. Handle budgets, expense tracking, ROI calculations, and financial planning.' },
  { role: 'marketer', label: '📢 Marketer', prompt: 'You are a marketing agent. Create strategies, copy, and campaigns. Know social media and ag marketing.' },
  { role: 'mod_builder', label: '🎮 Mod Builder', prompt: 'You are a Farming Simulator mod building agent. Analyze XML, i3d structures, and help debug/build FS22/FS25 mods.' },
  { role: 'scheduler', label: '📅 Scheduler', prompt: 'You are a scheduling agent. Manage calendars, deadlines, event planning, and time optimization.' },
  { role: 'debugger', label: '🐛 Debugger', prompt: 'You are a debugging agent. Find and fix errors in code, configs, and systems. Be methodical and thorough.' },
  { role: 'communicator', label: '💬 Communicator', prompt: 'You are a communications agent. Draft emails, messages, announcements, and handle outreach.' },
  { role: 'educator', label: '📚 Educator', prompt: 'You are an education agent. Create study guides, explain concepts, and help with homework in a student-friendly way.' },
  { role: 'synthesizer', label: '🧠 Synthesizer', prompt: 'You are a synthesis agent. Combine outputs from all other agents into a cohesive final report or action plan.' },
];

async function runAgent(
  apiKey: string,
  task: { id: string; role: string; prompt: string; model: string },
  objective: string,
  supabaseAdmin: any
): Promise<{ taskId: string; result: string; tokens: number; error?: string }> {
  const roleConfig = AGENT_ROLES.find(r => r.role === task.role) || AGENT_ROLES[0];

  try {
    // Mark task as running
    await supabaseAdmin.from('agent_swarm_tasks').update({
      status: 'running',
      started_at: new Date().toISOString(),
    }).eq('id', task.id);

    const response = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: task.model || 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: `${roleConfig.prompt}\n\nYou are Agent #${task.role} in a swarm of up to 18 specialized agents working together. Your specific task instructions follow. Be concise, actionable, and deliver results — not filler.` },
          { role: 'user', content: `SWARM OBJECTIVE: ${objective}\n\nYOUR SPECIFIC TASK: ${task.prompt}` },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || 'No response generated';
    const tokens = data.usage?.total_tokens || 0;

    // Mark task as completed
    await supabaseAdmin.from('agent_swarm_tasks').update({
      status: 'completed',
      result,
      tokens_used: tokens,
      completed_at: new Date().toISOString(),
    }).eq('id', task.id);

    return { taskId: task.id, result, tokens };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await supabaseAdmin.from('agent_swarm_tasks').update({
      status: 'failed',
      error_message: errorMsg,
      completed_at: new Date().toISOString(),
    }).eq('id', task.id);
    return { taskId: task.id, result: '', tokens: 0, error: errorMsg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auth check
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.user.id;

    // Admin client for writes
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { action, sessionId, objective, agents, taskUpdates } = await req.json();

    // GET ROLES
    if (action === 'get_roles') {
      return new Response(JSON.stringify({ roles: AGENT_ROLES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LAUNCH SWARM
    if (action === 'launch') {
      if (!objective || !agents || !Array.isArray(agents) || agents.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing objective or agents array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (agents.length > 18) {
        return new Response(JSON.stringify({ error: 'Maximum 18 agents per swarm' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('agent_swarm_sessions')
        .insert({
          user_id: userId,
          name: `Swarm: ${objective.substring(0, 50)}`,
          status: 'running',
          max_agents: agents.length,
          active_agents: agents.length,
          objective,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create task records
      const taskInserts = agents.map((agent: any, index: number) => ({
        session_id: session.id,
        user_id: userId,
        agent_index: index + 1,
        role: agent.role,
        role_label: AGENT_ROLES.find(r => r.role === agent.role)?.label || agent.role,
        prompt: agent.prompt || objective,
        status: 'queued',
        model: agent.model || 'google/gemini-3-flash-preview',
      }));

      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from('agent_swarm_tasks')
        .insert(taskInserts)
        .select();

      if (tasksError) throw tasksError;

      // Run all agents in parallel
      const results = await Promise.allSettled(
        tasks.map((task: any) => runAgent(LOVABLE_API_KEY, task, objective, supabaseAdmin))
      );

      const completedCount = results.filter(r => r.status === 'fulfilled' && !(r as any).value.error).length;
      const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r as any).value.error)).length;

      // Update session
      await supabaseAdmin.from('agent_swarm_sessions').update({
        status: failedCount === agents.length ? 'failed' : 'completed',
        active_agents: 0,
        completed_agents: completedCount,
      }).eq('id', session.id);

      // Fetch final tasks
      const { data: finalTasks } = await supabaseAdmin
        .from('agent_swarm_tasks')
        .select('*')
        .eq('session_id', session.id)
        .order('agent_index');

      return new Response(JSON.stringify({
        session: { ...session, status: 'completed', completed_agents: completedCount },
        tasks: finalTasks,
        summary: { total: agents.length, completed: completedCount, failed: failedCount },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET SESSION STATUS
    if (action === 'status') {
      const { data: session } = await supabaseAdmin
        .from('agent_swarm_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      const { data: tasks } = await supabaseAdmin
        .from('agent_swarm_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('agent_index');

      return new Response(JSON.stringify({ session, tasks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LIST SESSIONS
    if (action === 'list') {
      const { data: sessions } = await supabaseAdmin
        .from('agent_swarm_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ sessions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CANCEL SESSION
    if (action === 'cancel') {
      await supabaseAdmin.from('agent_swarm_sessions').update({ status: 'cancelled', active_agents: 0 }).eq('id', sessionId).eq('user_id', userId);
      await supabaseAdmin.from('agent_swarm_tasks').update({ status: 'cancelled' }).eq('session_id', sessionId).in('status', ['queued', 'running']);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Swarm orchestrator error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
