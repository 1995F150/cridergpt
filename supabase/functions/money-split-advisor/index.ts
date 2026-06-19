import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Bucket {
  key: string;
  label: string;
  desc: string;
}

interface RequestBody {
  income: number;
  period: string;
  currentPct: Record<string, number>;
  envelopes?: Record<string, number>;
  buckets: Bucket[];
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const { income, period, currentPct, envelopes = {}, buckets, notes } = body;

    const bucketList = buckets
      .map((b) => `- ${b.key} ("${b.label}"): ${b.desc}`)
      .join("\n");

    const currentSplit = buckets
      .map((b) => `  ${b.key}: ${currentPct[b.key] ?? 0}%`)
      .join("\n");

    const envBalances = buckets
      .map((b) => `  ${b.key}: $${(envelopes[b.key] ?? 0).toFixed(0)}`)
      .join("\n");

    const yearly =
      period === "daily" ? income * 365 :
      period === "weekly" ? income * 52 :
      period === "biweekly" ? income * 26 :
      period === "monthly" ? income * 12 : income;

    const system = `You are Jessie Crider — Southern, Gen Z, FFA Historian, welder, homesteader, app builder.
You give straight-shooter money advice. No corporate fluff, no AI-detection tells, no "Furthermore/Moreover".
Sound like a friend texting practical farm + business money guidance.

Output STRICT JSON only, no markdown fences, matching this shape:
{
  "suggestedPct": { "<bucket_key>": <number 0-100>, ... },   // MUST total exactly 100
  "direction": {
    "placement": "where to put each lockbox amount (1-2 short paragraphs, mention specific buckets)",
    "priorities": "what to pay first this pay period (bullet-like short lines separated by \\n)",
    "ffa": "FFA / livestock / feed specific guidance for this paycheck",
    "longterm": "monthly + yearly outlook and goal progress"
  },
  "summary": "1-2 sentence headline takeaway"
}

Rules:
- suggestedPct keys MUST be from the provided bucket keys only.
- suggestedPct values MUST be integers summing to 100.
- If income is low, prioritize Bills > Food > Emergency before Fun/Business.
- If livestock pct is 0 but user keeps livestock, suggest a small allocation.
- Be specific with dollar amounts (use the income provided).`;

    const userMsg = `Income: $${income} per ${period} (≈ $${yearly.toFixed(0)}/year)

Available buckets:
${bucketList}

Current user-set split:
${currentSplit}

Current envelope balances:
${envBalances}

${notes ? `User notes: ${notes}` : ""}

Give me a better split and direction. Return JSON only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace billing." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${txt}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON from any stray text
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    // Normalize suggestedPct to sum to 100 and only include known keys
    const validKeys = new Set(buckets.map((b) => b.key));
    const raw = parsed.suggestedPct ?? {};
    const cleaned: Record<string, number> = {};
    let sum = 0;
    for (const k of Object.keys(raw)) {
      if (!validKeys.has(k)) continue;
      const v = Math.max(0, Math.round(Number(raw[k]) || 0));
      cleaned[k] = v;
      sum += v;
    }
    if (sum !== 100 && sum > 0) {
      const factor = 100 / sum;
      let assigned = 0;
      const keys = Object.keys(cleaned);
      keys.forEach((k, i) => {
        if (i === keys.length - 1) cleaned[k] = 100 - assigned;
        else {
          cleaned[k] = Math.round(cleaned[k] * factor);
          assigned += cleaned[k];
        }
      });
    }
    parsed.suggestedPct = cleaned;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("money-split-advisor error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
