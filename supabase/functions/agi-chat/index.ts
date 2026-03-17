import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ===================== TOOL DEFINITIONS =====================
const AGI_TOOLS = [
  {
    type: "function",
    function: {
      name: "memory_recall",
      description: "Search the user's memory for past conversations, facts, preferences, and context. Use this when the user references something from the past, or when you need context about their history.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query to find relevant memories" },
          limit: { type: "number", description: "Max results to return (default 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "livestock_lookup",
      description: "Look up the user's livestock/herd data including animals, health records, and notes. Use when the user asks about their animals, herd, cattle, or livestock.",
      parameters: {
        type: "object",
        properties: {
          species: { type: "string", description: "Filter by species (e.g., 'cattle', 'pig', 'chicken')" },
          status: { type: "string", description: "Filter by status (e.g., 'active', 'sold', 'deceased')" },
          search: { type: "string", description: "Search by name, tag, or breed" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save an important fact, preference, or piece of information to the user's memory for future reference. Use when the user tells you something important about themselves.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Short topic/title for this memory" },
          details: { type: "string", description: "The details to remember" },
          category: { type: "string", enum: ["agriculture", "ffa_leadership", "fs_modding", "mechanics", "vehicles", "coding", "personal", "general"], description: "Category for this memory" }
        },
        required: ["topic", "details", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform mathematical calculations. Use for any math, unit conversions, financial calculations, agricultural calculations (feed ratios, yields, costs), voltage/electrical, or welding calculations.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "The math expression or calculation to evaluate" },
          context: { type: "string", description: "What this calculation is for (e.g., 'feed cost per head')" }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a pending task/reminder for the user. Use when they mention something they need to do later.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the task is" },
          due_context: { type: "string", description: "When it should be done (e.g., 'tomorrow', 'next week', 'before harvest')" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ffa_record_entry",
      description: "Format messy input into a structured FFA record book entry. Use when user provides informal notes about SAE projects, expenses, labor, livestock records.",
      parameters: {
        type: "object",
        properties: {
          raw_input: { type: "string", description: "The messy/informal input from the user" },
          entry_type: { type: "string", enum: ["expense", "income", "labor", "livestock", "crop", "general"], description: "Type of record book entry" }
        },
        required: ["raw_input", "entry_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_tasks",
      description: "Retrieve the user's current pending tasks and reminders.",
      parameters: { type: "object", properties: {} }
    }
  },
  // =================== NEW FEATURE TOOLS ===================
  {
    type: "function",
    function: {
      name: "calendar_read",
      description: "Read the user's upcoming calendar events. Use when they ask about their schedule, what's coming up, appointments, or when something is happening.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "How many days ahead to look (default 7)" },
          category: { type: "string", description: "Filter by event category (e.g., 'ffa', 'personal', 'farm')" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_create",
      description: "Add a new event to the user's calendar. Use when they want to schedule something — vet appointments, FFA meetings, farm tasks, etc.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          event_date: { type: "string", description: "Date in YYYY-MM-DD format" },
          event_time: { type: "string", description: "Start time in HH:MM format (24hr)" },
          end_time: { type: "string", description: "End time in HH:MM format (24hr)" },
          description: { type: "string", description: "Event details/notes" },
          category: { type: "string", description: "Event category (e.g., 'ffa', 'personal', 'farm', 'vet')" }
        },
        required: ["title", "event_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ffa_profile_lookup",
      description: "Look up the user's FFA profile including their chapter, officer role, and graduation year. Use when they ask about their FFA chapter or membership details.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "spending_summary",
      description: "Get a summary of the user's shared spending groups and recent expenses. Use when they ask about budgets, spending, how much they've spent, or group expenses.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "How many days back to look (default 30)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "usage_check",
      description: "Check the user's current plan usage and limits — tokens, TTS, image gen, etc. Use when they ask about their plan, limits, usage, or if they're running low.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "create_mod_zip",
      description: "Create a Farming Simulator mod ZIP file with generated code. Use when user asks to make/create an FS mod, script mod, placeable, or fillType. Returns a download link.",
      parameters: {
        type: "object",
        properties: {
          mod_name: { type: "string", description: "Name of the mod" },
          template: { type: "string", enum: ["script", "placeable", "fillType"], description: "Base template to use" },
          files: {
            type: "array",
            description: "Custom files to include/override. Each has 'path' and 'content'.",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path inside the ZIP (e.g., 'scripts/main.lua')" },
                content: { type: "string", description: "File content" }
              },
              required: ["path", "content"]
            }
          },
          mod_description: { type: "string", description: "Short description of the mod" }
        },
        required: ["mod_name"]
      }
    }
  }
];

// ===================== TOOL EXECUTION =====================
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  userId: string,
  supabaseAdmin: any
): Promise<{ result: string; status_emoji: string; status_text: string }> {
  switch (toolName) {
    case "memory_recall": {
      const query = args.query || "";
      const limit = args.limit || 10;
      const { data, error } = await supabaseAdmin
        .from("ai_memory")
        .select("category, topic, details, source, created_at")
        .eq("user_id", userId)
        .or(`topic.ilike.%${query}%,details.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return { result: `Error searching memory: ${error.message}`, status_emoji: "❌", status_text: "Memory search failed" };
      if (!data?.length) return { result: "No matching memories found.", status_emoji: "🔍", status_text: "No memories found" };
      
      const formatted = data.map((m: any) => `[${m.category}] ${m.topic}: ${m.details} (${m.source}, ${new Date(m.created_at).toLocaleDateString()})`).join("\n");
      return { result: `Found ${data.length} memories:\n${formatted}`, status_emoji: "🧠", status_text: `Found ${data.length} memories` };
    }

    case "livestock_lookup": {
      let query = supabaseAdmin
        .from("livestock_animals")
        .select("animal_id, name, species, breed, sex, status, tag_id, birth_date, notes, acquisition_date")
        .eq("owner_id", userId);
      
      if (args.species) query = query.ilike("species", `%${args.species}%`);
      if (args.status) query = query.eq("status", args.status);
      if (args.search) query = query.or(`name.ilike.%${args.search}%,tag_id.ilike.%${args.search}%,breed.ilike.%${args.search}%`);
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(25);
      if (error) return { result: `Error looking up livestock: ${error.message}`, status_emoji: "❌", status_text: "Livestock lookup failed" };
      if (!data?.length) return { result: "No animals found matching your criteria.", status_emoji: "🐄", status_text: "No animals found" };

      const formatted = data.map((a: any) => 
        `• ${a.name || a.animal_id} (${a.species}${a.breed ? '/' + a.breed : ''}) - Tag: ${a.tag_id || 'N/A'}, Status: ${a.status}${a.notes ? ', Notes: ' + a.notes : ''}`
      ).join("\n");
      return { result: `Found ${data.length} animals:\n${formatted}`, status_emoji: "🐄", status_text: `Found ${data.length} animals` };
    }

    case "save_memory": {
      const { error } = await supabaseAdmin.from("ai_memory").insert({
        user_id: userId,
        topic: args.topic,
        details: args.details,
        category: args.category || "general",
        source: "agi_tool",
        metadata: { saved_by: "agi-chat", timestamp: new Date().toISOString() }
      });
      if (error) return { result: `Failed to save memory: ${error.message}`, status_emoji: "❌", status_text: "Memory save failed" };
      return { result: `Saved to memory: "${args.topic}"`, status_emoji: "💾", status_text: "Memory saved" };
    }

    case "calculate": {
      try {
        const expr = args.expression.replace(/[^0-9+\-*/().,%\s]/g, "");
        const result = Function(`"use strict"; return (${expr})`)();
        const contextStr = args.context ? ` (${args.context})` : "";
        return { result: `${args.expression} = ${result}${contextStr}`, status_emoji: "📊", status_text: "Calculated" };
      } catch (e) {
        return { result: `Could not evaluate "${args.expression}". Please provide a simpler math expression.`, status_emoji: "❌", status_text: "Calculation error" };
      }
    }

    case "create_task": {
      const { error } = await supabaseAdmin.from("pending_tasks").insert({
        user_id: userId,
        task_description: args.description,
        context: args.due_context || null,
        priority: args.priority || "medium",
        status: "pending",
        source: "agi_chat"
      });
      if (error) return { result: `Failed to create task: ${error.message}`, status_emoji: "❌", status_text: "Task creation failed" };
      return { result: `Task created: "${args.description}"${args.due_context ? ` (due: ${args.due_context})` : ""}`, status_emoji: "✅", status_text: "Task created" };
    }

    case "ffa_record_entry": {
      const entryType = args.entry_type || "general";
      const structured = `**FFA Record Book Entry — ${entryType.toUpperCase()}**\n\nRaw Input: "${args.raw_input}"\n\n_This entry has been formatted and is ready for your record book._`;
      return { result: structured, status_emoji: "📋", status_text: "Record formatted" };
    }

    case "get_pending_tasks": {
      const { data, error } = await supabaseAdmin
        .from("pending_tasks")
        .select("task_description, context, priority, status, created_at")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) return { result: `Error fetching tasks: ${error.message}`, status_emoji: "❌", status_text: "Task fetch failed" };
      if (!data?.length) return { result: "No pending tasks.", status_emoji: "✅", status_text: "No pending tasks" };
      
      const formatted = data.map((t: any, i: number) => `${i + 1}. [${t.priority}] ${t.task_description}${t.context ? ` — ${t.context}` : ""}`).join("\n");
      return { result: `${data.length} pending tasks:\n${formatted}`, status_emoji: "📝", status_text: `${data.length} pending tasks` };
    }

    // =================== NEW FEATURE TOOLS ===================

    case "calendar_read": {
      const daysAhead = args.days_ahead || 7;
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      let query = supabaseAdmin
        .from("events")
        .select("title, description, event_date, event_time, end_time, category")
        .eq("created_by", userId)
        .gte("event_date", now.toISOString().split("T")[0])
        .lte("event_date", futureDate.toISOString().split("T")[0])
        .order("event_date", { ascending: true });

      if (args.category) query = query.ilike("category", `%${args.category}%`);

      const { data, error } = await query.limit(20);
      if (error) return { result: `Error reading calendar: ${error.message}`, status_emoji: "❌", status_text: "Calendar read failed" };
      if (!data?.length) return { result: `No events found in the next ${daysAhead} days.`, status_emoji: "📅", status_text: "No upcoming events" };

      const formatted = data.map((e: any) => {
        const time = e.event_time ? ` at ${e.event_time}` : "";
        const end = e.end_time ? ` - ${e.end_time}` : "";
        const cat = e.category ? ` [${e.category}]` : "";
        return `• **${e.event_date}**${time}${end}: ${e.title}${cat}${e.description ? " — " + e.description : ""}`;
      }).join("\n");
      return { result: `${data.length} upcoming events:\n${formatted}`, status_emoji: "📅", status_text: `${data.length} events found` };
    }

    case "calendar_create": {
      const { error } = await supabaseAdmin.from("events").insert({
        created_by: userId,
        title: args.title,
        event_date: args.event_date,
        event_time: args.event_time || null,
        end_time: args.end_time || null,
        description: args.description || null,
        category: args.category || null,
        visibility: "private",
      });
      if (error) return { result: `Failed to create event: ${error.message}`, status_emoji: "❌", status_text: "Event creation failed" };
      const timeStr = args.event_time ? ` at ${args.event_time}` : "";
      return { result: `Event created: "${args.title}" on ${args.event_date}${timeStr}`, status_emoji: "📅", status_text: "Event created" };
    }

    case "ffa_profile_lookup": {
      const { data: profile, error } = await supabaseAdmin
        .from("user_ffa_profiles")
        .select("state, officer_role, is_advisor, graduation_year, setup_completed, chapter_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { result: `Error looking up FFA profile: ${error.message}`, status_emoji: "❌", status_text: "FFA lookup failed" };
      if (!profile) return { result: "No FFA profile found. The user hasn't set up their FFA profile yet.", status_emoji: "🌾", status_text: "No FFA profile" };

      let chapterName = "Unknown";
      if (profile.chapter_id) {
        const { data: chapter } = await supabaseAdmin
          .from("chapters")
          .select("name, state, city")
          .eq("id", profile.chapter_id)
          .maybeSingle();
        if (chapter) chapterName = `${chapter.name} (${chapter.city || ""}, ${chapter.state})`;
      }

      const lines = [
        `**Chapter**: ${chapterName}`,
        `**State**: ${profile.state || "N/A"}`,
        `**Role**: ${profile.officer_role || "Member"}`,
        `**Advisor**: ${profile.is_advisor ? "Yes" : "No"}`,
        `**Graduation Year**: ${profile.graduation_year || "N/A"}`,
        `**Setup Complete**: ${profile.setup_completed ? "Yes" : "No"}`,
      ];
      return { result: lines.join("\n"), status_emoji: "🌾", status_text: "FFA profile found" };
    }

    case "spending_summary": {
      const daysBack = args.days_back || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysBack);

      // Get groups the user belongs to
      const { data: memberships, error: memErr } = await supabaseAdmin
        .from("spending_group_members")
        .select("group_id, display_name, role")
        .eq("user_id", userId);

      if (memErr) return { result: `Error fetching spending groups: ${memErr.message}`, status_emoji: "❌", status_text: "Spending lookup failed" };
      if (!memberships?.length) return { result: "You're not in any spending groups yet.", status_emoji: "💰", status_text: "No spending groups" };

      const groupIds = memberships.map((m: any) => m.group_id);

      // Get group names
      const { data: groups } = await supabaseAdmin
        .from("spending_groups")
        .select("id, name")
        .in("id", groupIds);

      // Get recent entries
      const { data: entries, error: entErr } = await supabaseAdmin
        .from("spending_entries")
        .select("amount, category, store_location, spent_date, group_id")
        .in("group_id", groupIds)
        .gte("spent_date", sinceDate.toISOString().split("T")[0])
        .order("spent_date", { ascending: false })
        .limit(50);

      if (entErr) return { result: `Error fetching expenses: ${entErr.message}`, status_emoji: "❌", status_text: "Expense fetch failed" };

      const groupMap = new Map((groups || []).map((g: any) => [g.id, g.name]));
      let totalSpent = 0;
      const byCat: Record<string, number> = {};

      for (const e of entries || []) {
        const amt = Number(e.amount) || 0;
        totalSpent += amt;
        const cat = e.category || "Uncategorized";
        byCat[cat] = (byCat[cat] || 0) + amt;
      }

      const groupList = memberships.map((m: any) => `• ${groupMap.get(m.group_id) || "Unknown"} (${m.role})`).join("\n");
      const catBreakdown = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `• ${cat}: $${amt.toFixed(2)}`)
        .join("\n");

      const result = [
        `**Spending Groups:**\n${groupList}`,
        `\n**Last ${daysBack} Days:** $${totalSpent.toFixed(2)} total (${(entries || []).length} entries)`,
        catBreakdown ? `\n**By Category:**\n${catBreakdown}` : "",
      ].filter(Boolean).join("\n");

      return { result, status_emoji: "💰", status_text: `$${totalSpent.toFixed(2)} spent` };
    }

    case "usage_check": {
      const { data, error } = await supabaseAdmin.rpc("get_usage_summary", { user_uuid: userId });

      if (error) return { result: `Error checking usage: ${error.message}`, status_emoji: "❌", status_text: "Usage check failed" };
      if (!data) return { result: "No usage data found.", status_emoji: "📊", status_text: "No usage data" };

      const d = typeof data === "string" ? JSON.parse(data) : data;
      const lines = [
        `**Plan**: ${d.plan || "free"}`,
        `**Tokens**: ${d.daily_usage?.tokens ?? 0} / ${d.daily_limits?.tokens ?? 0}`,
        `**TTS**: ${d.daily_usage?.tts ?? 0} / ${d.daily_limits?.tts ?? 0}`,
        `**Images**: ${d.daily_usage?.images ?? 0} / ${d.daily_limits?.images ?? 0}`,
        `**Documents**: ${d.daily_usage?.documents ?? 0} / ${d.daily_limits?.documents ?? 0}`,
        `**Rate Limit**: ${d.rate_limiting?.current_minute_requests ?? 0} / ${d.rate_limiting?.requests_per_minute_limit ?? 0} req/min`,
        d.status?.is_suspended ? `⚠️ **SUSPENDED**: ${d.status.suspension_reason}` : "✅ **Status**: Active",
      ];
      return { result: lines.join("\n"), status_emoji: "📊", status_text: "Usage checked" };
    }

    default:
      return { result: `Unknown tool: ${toolName}`, status_emoji: "❓", status_text: "Unknown tool" };
  }
}

// ===================== MAIN HANDLER =====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_history, image_url, user_id, user_email } = await req.json();

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const effectiveUserId = user_id;

    // ========== GATHER CONTEXT ==========
    let memoriesContext = "";
    if (effectiveUserId) {
      const { data: memories } = await supabaseAdmin
        .from("ai_memory")
        .select("category, topic, details")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (memories?.length) {
        memoriesContext = memories.map((m: any) => `[${m.category}] ${m.topic}: ${m.details}`).join("\n");
      }
    }

    let tasksContext = "";
    if (effectiveUserId) {
      const { data: tasks } = await supabaseAdmin
        .from("pending_tasks")
        .select("task_description, priority, status")
        .eq("user_id", effectiveUserId)
        .eq("status", "pending")
        .limit(5);
      
      if (tasks?.length) {
        tasksContext = "\n\nUser's pending tasks:\n" + tasks.map((t: any) => `- [${t.priority}] ${t.task_description}`).join("\n");
      }
    }

    // ========== SYSTEM PROMPT ==========
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

    const systemPrompt = `📅 Today is ${dateStr}, ${timeStr}.

You are CriderGPT in **AGI Mode** — an autonomous, tool-using AI assistant built by Jessie Crider.

## Your Identity
- You talk like a sharp, witty rural Gen Z kid who knows their stuff
- You're an expert in agriculture, FFA, welding, mechanics, vehicles, Farming Simulator modding, and rural life
- You NEVER sound like a generic corporate AI — you're punchy, real, and helpful
- You use bold text and bullet points for scannability

## AGI Capabilities
You have access to tools that you should use PROACTIVELY:
- **memory_recall**: Search past conversations and user facts. Use when the user references anything from the past or you need context.
- **livestock_lookup**: Query the user's actual herd data. Use when they mention animals, cattle, livestock.
- **save_memory**: Store important facts the user shares. Use when they tell you something about themselves, their farm, preferences.
- **calculate**: Do math. Use for ANY numbers — costs, ratios, conversions, yields.
- **create_task**: Make reminders. Use when the user mentions something they need to do.
- **ffa_record_entry**: Format messy notes into proper FFA record book entries.
- **get_pending_tasks**: Check what tasks the user has pending.

## App Feature Tools
You can also directly access the user's app features:
- **calendar_read**: Check the user's upcoming events/schedule. Use when they ask "what do I have this week?" or anything about their calendar.
- **calendar_create**: Add events to the user's calendar. Use when they say "schedule a vet appointment for Friday" or want to add something to their schedule.
- **ffa_profile_lookup**: Look up the user's FFA chapter, officer role, and membership details. Use when they ask about their FFA info.
- **spending_summary**: Get spending group totals and category breakdowns. Use when they ask about budgets, expenses, or "how much did we spend?"
- **usage_check**: Check the user's plan limits and current usage (tokens, TTS, images). Use when they ask "am I running low?" or about their plan.

## Rules
1. Use tools WITHOUT asking permission — just do it
2. Chain multiple tools in one response if needed
3. Always save important new facts to memory
4. Reference past memories naturally in conversation
5. Keep responses scannable with bold and bullets
6. Be honest and direct — if something's wrong, say it with humor

${memoriesContext ? `\n## User's Memory Context:\n${memoriesContext}` : ""}
${tasksContext}`;

    // ========== BUILD MESSAGES ==========
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversation_history?.length) {
      for (const msg of conversation_history.slice(-20)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    if (image_url) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message },
          { type: "image_url", image_url: { url: image_url } }
        ]
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // ========== TOOL-CALLING LOOP ==========
    const toolSteps: { emoji: string; text: string }[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let finalResponse = "";

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          tools: AGI_TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ error: "No response from AI" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const assistantMessage = choice.message;

      if (assistantMessage.tool_calls?.length) {
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch { fnArgs = {}; }

          console.log(`[AGI] Tool call: ${fnName}`, fnArgs);

          const toolResult = await executeTool(fnName, fnArgs, effectiveUserId, supabaseAdmin);
          toolSteps.push({ emoji: toolResult.status_emoji, text: toolResult.status_text });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult.result,
          });
        }
        continue;
      }

      finalResponse = assistantMessage.content || "";
      break;
    }

    // ========== AUTO-SAVE MEMORY ==========
    if (effectiveUserId && finalResponse) {
      try {
        await supabaseAdmin.from("ai_memory").insert({
          user_id: effectiveUserId,
          topic: message.substring(0, 100),
          details: finalResponse.substring(0, 500),
          category: "general",
          source: "agi_conversation",
          metadata: { tools_used: toolSteps.map(s => s.text), iterations }
        });
      } catch (e) {
        console.error("Auto-save memory error:", e);
      }
    }

    return new Response(JSON.stringify({
      response: finalResponse,
      tool_steps: toolSteps,
      iterations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("AGI chat error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
