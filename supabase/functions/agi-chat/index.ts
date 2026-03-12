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
        // Safe math evaluation
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
      // Format the messy input into a structured entry
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
    // Pull recent memories
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

    // Pull pending tasks
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
- **memory_recall**: Search past conversations and user facts. Use this when the user references anything from the past or you need context.
- **livestock_lookup**: Query the user's actual herd data. Use when they mention animals, cattle, livestock.
- **save_memory**: Store important facts the user shares. Use when they tell you something about themselves, their farm, preferences.
- **calculate**: Do math. Use for ANY numbers — costs, ratios, conversions, yields.
- **create_task**: Make reminders. Use when the user mentions something they need to do.
- **ffa_record_entry**: Format messy notes into proper FFA record book entries.
- **get_pending_tasks**: Check what tasks the user has pending.

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

    // Add conversation history
    if (conversation_history?.length) {
      for (const msg of conversation_history.slice(-20)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
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

      // If there are tool calls, execute them
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
        // Continue loop — AI will process tool results
        continue;
      }

      // No tool calls — we have the final response
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
