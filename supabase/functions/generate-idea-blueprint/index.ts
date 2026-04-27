import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, title } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert inventor, engineer, woodworker, leatherworker, and product designer turning rough ideas into actionable, buildable blueprints.

Call the function "build_blueprint" exactly once.

CRITICAL — pick the correct blueprint_kind:
- "system_diagram" → for electronics, software, IoT, networked devices. Provide \`mermaid\`.
- "physical_blueprint" → for physical objects (beehives, leather goods, furniture, mechanical parts, structures, jigs). Provide \`blueprint_svg\`: a clean, labeled top-down or exploded technical drawing as a complete <svg> string (viewBox 0 0 800 600, white background, black strokes, labeled dimensions in inches/cm, callouts for each part). Looks like a hand-drafted blueprint.
- "hybrid" → both. Provide both fields.

Always provide:
- summary: 2-4 sentence plain overview
- parts: [{name, category, qty, notes}] — categories: electronics, hardware, material, tool, software, fastener, finish, other
- steps: [{phase, title, detail}] grouped by phase (Design, Materials, Cut, Assembly, Wiring, Firmware, Finish, Testing — pick what fits)

Be concrete: real chip names, wire gauges, lumber sizes (2x4 pine), leather weights (5-6oz veg-tan), thread types, fastener specs.

For blueprint_svg, draw with intent: rectangles for parts, dashed lines for hidden edges, arrows + text for dimensions, a small legend, a title block in the bottom-right. No emojis. Pure SVG, no <script>. Keep under 8KB.`;

    const tools = [{
      type: "function",
      function: {
        name: "build_blueprint",
        description: "Return a structured invention/product blueprint",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            blueprint_kind: { type: "string", enum: ["system_diagram", "physical_blueprint", "hybrid"] },
            mermaid: { type: "string", description: "Mermaid flowchart TD when electronics/system" },
            blueprint_svg: { type: "string", description: "Complete <svg>...</svg> physical drawing when physical object" },
            parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  qty: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["name", "category", "qty"],
                additionalProperties: false,
              },
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phase: { type: "string" },
                  title: { type: "string" },
                  detail: { type: "string" },
                },
                required: ["phase", "title", "detail"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "blueprint_kind", "parts", "steps"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title || "Untitled idea"}\n\nIdea: ${prompt}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "build_blueprint" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit, try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no blueprint" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const blueprint = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(blueprint), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-idea-blueprint error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
