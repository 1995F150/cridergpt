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

    const systemPrompt = `You are an expert inventor, electrical engineer, and product designer helping turn rough invention ideas into actionable buildable blueprints.

For every idea you receive you MUST call the function "build_blueprint" exactly once with:
- summary: 2-4 sentence plain-English overview of what the thing is and how it works
- mermaid: a valid Mermaid "flowchart TD" diagram (boxes + arrows) showing how components connect. Use simple labels, no emojis, no special characters that break Mermaid. Example:
    flowchart TD
      A[Sensor] --> B[Microcontroller]
      B --> C[Wi-Fi Module]
      C --> D[Cloud Server]
- parts: array of physical/electronic parts needed. Each: {name, category, qty, notes}. Categories: electronics, hardware, material, tool, software, other.
- steps: ordered build steps. Each: {phase, title, detail}. Group by logical phase (e.g. "Prototype", "Wiring", "Firmware", "Testing").

Be specific: name actual chips (ESP32, ATmega328P), wire gauges (22 AWG), languages (C++/Arduino, MicroPython), libraries. Assume hobbyist-to-pro maker audience.`;

    const tools = [{
      type: "function",
      function: {
        name: "build_blueprint",
        description: "Return a structured invention/product blueprint",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            mermaid: { type: "string" },
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
          required: ["summary", "mermaid", "parts", "steps"],
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
        model: "google/gemini-3-flash-preview",
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
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
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
