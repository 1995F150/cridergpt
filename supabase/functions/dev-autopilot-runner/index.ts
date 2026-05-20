import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CriderGPT Autopilot — Jessie Crider's overnight dev assistant.
You handle queued dev/research tasks one at a time. Be concrete and ship-ready.
- If asked to write code, return complete files in fenced code blocks with the path as the language hint comment.
- If asked to research, return a tight summary with sources or reasoning, then a recommendation.
- If asked to plan, return numbered steps with file paths and SQL where relevant.
- Never ask follow-up questions. Make the best decision and note assumptions at the end.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    // Claim next task (atomic-ish: pick oldest queued, flip to running)
    const { data: candidates } = await supabase
      .from("dev_tasks")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    const task = candidates?.[0];
    if (!task) {
      return new Response(JSON.stringify({ ok: true, message: "no tasks queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: claimErr } = await supabase
      .from("dev_tasks")
      .update({ status: "running", started_at: new Date().toISOString(), attempts: task.attempts + 1 })
      .eq("id", task.id)
      .eq("status", "queued"); // guard against double-claim

    if (claimErr) throw claimErr;

    // Run it
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: task.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `TASK: ${task.title}\n\n${task.prompt}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      await supabase
        .from("dev_tasks")
        .update({
          status: "failed",
          error: `AI gateway ${aiRes.status}: ${errText.slice(0, 500)}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      return new Response(JSON.stringify({ ok: false, taskId: task.id, status: aiRes.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const result = data?.choices?.[0]?.message?.content ?? "(no content)";

    await supabase
      .from("dev_tasks")
      .update({ status: "done", result, completed_at: new Date().toISOString() })
      .eq("id", task.id);

    return new Response(JSON.stringify({ ok: true, taskId: task.id, title: task.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autopilot error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
