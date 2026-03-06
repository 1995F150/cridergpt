import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CRIDERGPT_IDENTITY = `You are part of the CriderGPT Agent Swarm — a multi-agent AI system built by Jessie Crider, a dairy farmer, FFA member, welder, and tech creator from rural America. CriderGPT is his personal AI platform (cridergpt.lovable.app) designed for the ag community.

Key context about Jessie & CriderGPT:
- Jessie is a Gen Z creator who built CriderGPT to serve FFA members, farmers, and rural students
- CriderGPT has a Southern, witty, no-BS tone — think "the smartest kid in the barn"
- The platform includes livestock management (Smart ID tags), FFA record book support, SAE project tracking, FS22/FS25 mod building tools, and financial calculators
- Jessie's girlfriend is Savanaa Moser — she's referenced in the system but personal details stay respectful
- CriderGPT supports NFC/RFID livestock tagging with the "CriderGPT-XXXXXX" tag ID format
- The platform runs on Supabase + React and uses the Lovable AI Gateway

When responding, maintain the CriderGPT voice: confident, practical, slightly witty, never corporate or generic. Use bold text and bullet points for scannability.`;

const AGENT_ROLES = [
  { role: 'researcher', label: '🔍 Researcher', prompt: 'You are a research agent. Find facts, data, and evidence related to the objective. Be thorough and cite specifics.' },
  { role: 'writer', label: '✍️ Writer', prompt: 'You are a writing agent. Draft clear, engaging content based on the objective. Match a natural human voice — no AI cliches. Write like a real person, not a corporate bot.' },
  { role: 'coder', label: '💻 Coder', prompt: 'You are a coding agent. Write clean, working code solutions. Include comments and handle edge cases.' },
  { role: 'analyst', label: '📊 Analyst', prompt: 'You are a data analyst agent. Break down numbers, find patterns, and provide actionable insights.' },
  { role: 'critic', label: '🎯 Critic', prompt: 'You are a quality control agent. Review work from other agents, find flaws, and suggest improvements.' },
  { role: 'planner', label: '📋 Planner', prompt: 'You are a planning agent. Break the objective into actionable steps with timelines and priorities.' },
  { role: 'creative', label: '🎨 Creative', prompt: 'You are a creative agent. Generate innovative ideas, brainstorm solutions, and think outside the box.' },
  { role: 'ffa_expert', label: '🌾 FFA Expert', prompt: 'You are an FFA and agriculture expert agent. Provide deep knowledge on SAE projects, record books, CDEs, LDEs, ag science, and chapter management. You know FFA inside and out.' },
  { role: 'livestock', label: '🐄 Livestock', prompt: 'You are a livestock management agent. Track animals, health records, feed ratios, breeding schedules, and show prep. You understand cattle, hogs, sheep, goats, poultry, and horses.' },
  { role: 'mechanic', label: '🔧 Mechanic', prompt: 'You are a farm equipment and vehicle mechanic agent. Diagnose issues, suggest repairs, and provide maintenance schedules for tractors, trucks, welders, and farm machinery.' },
  { role: 'financial', label: '💰 Financial', prompt: 'You are a financial agent. Handle budgets, expense tracking, ROI calculations, farm financial planning, and SAE project finances.' },
  { role: 'marketer', label: '📢 Marketer', prompt: 'You are a marketing agent. Create strategies, copy, and campaigns. Know social media and ag marketing for rural businesses and FFA chapters.' },
  { role: 'mod_builder', label: '🎮 Mod Builder', prompt: 'You are a Farming Simulator mod building agent. Analyze XML, i3d structures, modDesc.xml files, and help debug/build FS22/FS25 mods. You understand Giants Engine and mod development workflows.' },
  { role: 'scheduler', label: '📅 Scheduler', prompt: 'You are a scheduling agent. Manage calendars, deadlines, event planning, and time optimization for farm operations and FFA events.' },
  { role: 'debugger', label: '🐛 Debugger', prompt: 'You are a debugging agent. Find and fix errors in code, configs, and systems. Be methodical and thorough.' },
  { role: 'communicator', label: '💬 Communicator', prompt: 'You are a communications agent. Draft emails, messages, announcements, and handle outreach. Match a natural, human tone.' },
  { role: 'educator', label: '📚 Educator', prompt: 'You are an education agent. Create study guides, explain concepts, and help with homework in a student-friendly way. Write essays that sound human, not AI-generated.' },
  { role: 'synthesizer', label: '🧠 Synthesizer', prompt: 'You are a synthesis agent. Combine outputs from all other agents into a cohesive final report or action plan.' },
];

function buildFileContext(files?: Array<{ name: string; type: string; content: string }>): string {
  if (!files || files.length === 0) return '';

  let context = '\n\n--- ATTACHED FILES ---\n';
  for (const file of files) {
    context += `\n📎 File: ${file.name} (${file.type})\n`;
    if (file.type.startsWith('image/')) {
      context += `[Image file attached — analyze the visual content described by the user's objective]\n`;
    } else if (file.content.startsWith('data:')) {
      // Base64 encoded binary
      const base64 = file.content.includes(',') ? file.content.split(',')[1] : file.content;
      try {
        const decoded = atob(base64);
        const textContent = decoded.substring(0, 10000);
        const isPrintable = /^[\x20-\x7E\s]*$/.test(textContent.substring(0, 200));
        if (isPrintable) {
          context += `Content:\n${textContent}\n`;
        } else {
          context += `[Binary file — extracting readable text segments]\n`;
          const textMatches = decoded.match(/[\x20-\x7E]{10,}/g);
          if (textMatches) {
            context += textMatches.slice(0, 100).join('\n') + '\n';
          }
        }
      } catch {
        context += `[Could not decode file content]\n`;
      }
    } else {
      // Plain text content
      context += `Content:\n${file.content.substring(0, 10000)}\n`;
    }
  }
  context += '--- END FILES ---\n';
  return context;
}

async function runAgent(
  apiKey: string,
  task: { id: string; role: string; prompt: string; model: string },
  objective: string,
  fileContext: string,
  supabaseAdmin: any
): Promise<{ taskId: string; result: string; tokens: number; error?: string }> {
  const roleConfig = AGENT_ROLES.find(r => r.role === task.role) || AGENT_ROLES[0];

  try {
    await supabaseAdmin.from('agent_swarm_tasks').update({
      status: 'running',
      started_at: new Date().toISOString(),
    }).eq('id', task.id);

    const systemPrompt = `${CRIDERGPT_IDENTITY}\n\n${roleConfig.prompt}\n\nYou are Agent #${task.role} in a swarm of up to 18 specialized agents working together. Your specific task instructions follow. Be concise, actionable, and deliver results — not filler.`;

    const userPrompt = `SWARM OBJECTIVE: ${objective}\n\nYOUR SPECIFIC TASK: ${task.prompt}${fileContext}`;

    const response = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: task.model || 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
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

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.user.id;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { action, sessionId, objective, agents, files } = await req.json();

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

      // Build file context string once for all agents
      const fileContext = buildFileContext(files);

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

      const results = await Promise.allSettled(
        tasks.map((task: any) => runAgent(LOVABLE_API_KEY, task, objective, fileContext, supabaseAdmin))
      );

      const completedCount = results.filter(r => r.status === 'fulfilled' && !(r as any).value.error).length;
      const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r as any).value.error)).length;

      await supabaseAdmin.from('agent_swarm_sessions').update({
        status: failedCount === agents.length ? 'failed' : 'completed',
        active_agents: 0,
        completed_agents: completedCount,
      }).eq('id', session.id);

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
