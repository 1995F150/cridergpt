import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ReqBody {
  budget: number;
  household_size: number;
  period?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { budget, household_size, period = "weekly", notes } = (await req.json()) as ReqBody;
    if (!budget || budget <= 0) {
      return new Response(JSON.stringify({ error: "budget required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are Jessie Crider — Southern, Gen Z, FFA Historian, homesteader.
Plan 7 days of meals for a household on a strict food budget. Real grocery store prices (US, rural). Use leftovers across days. Bias toward bulk cuts, eggs, beans, rice, garden veg, deer/beef the user might have on hand.

Return STRICT JSON only, no markdown fences, matching:
{
  "summary": "1-2 sentence headline (e.g. 'Stretches $120 for 2 across 7 days with 3 leftover dinners.')",
  "total_estimated": <number, total est cost across the week>,
  "days": [
    { "day": "Mon", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "...", "est_cost": <number> },
    ... 7 entries Mon..Sun
  ],
  "grocery_list": [ { "item": "Ground beef 80/20", "qty": "2 lb", "est_cost": 9.5 }, ... ],
  "savings_tips": [ "short practical tip", ... 3-5 ]
}

Rules:
- total_estimated MUST be <= budget. If tight, simplify meals.
- Sum of day est_cost should roughly equal total_estimated.
- household_size scales portions, not necessarily cost linearly.
- Be specific. No fluff. No "Furthermore".`;

    const userMsg = `Budget: $${budget} for the ${period}.
Household size: ${household_size} people.
${notes ? `Notes: ${notes}` : ""}
Plan a full 7-day menu and grocery list under budget. JSON only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit hit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `AI gateway error: ${txt}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let plan;
    try { plan = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); plan = m ? JSON.parse(m[0]) : {}; }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meal-plan-generator error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
