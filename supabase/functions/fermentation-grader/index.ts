import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ReqBody {
  imageData: string; // data: URL
  productType?: string; // "wine must", "beer wort", "cider"
  stage?: string;       // "primary day 1", "secondary", etc.
  ingredients?: string; // optional context: "blackberry + brown sugar + bread yeast"
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
    const { imageData, productType = "wine must", stage = "primary fermentation", ingredients, notes } =
      (await req.json()) as ReqBody;
    if (!imageData || !imageData.startsWith("data:image")) {
      return new Response(JSON.stringify({ error: "imageData (data URL) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a home fermentation expert grading a photo of fermenting must.
The user has added sugar (often brown sugar) to fruit juice — you are looking at the bubble/krausen activity to predict outcome.

Visually estimate:
- bubble density and thickness on the surface (thin film vs thick foamy krausen)
- CO2-like bubbling vs surface foam (foam is yeast activity; bubbles below could be released CO2)
- color and clarity of the liquid (cloudy = active yeast, layered = settling)
- any concerning signs (mold spots, surface film/pellicle, oily slick)

Return STRICT JSON only, no markdown fences, matching:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "score": <0-100>,
  "stage_observed": "lag" | "active" | "peak" | "slowing" | "stalled" | "finished" | "spoiled",
  "predicted_outcome": "1-2 sentences on how the wine/brew will likely turn out",
  "fermentation_health": "what you see in the foam/bubbles",
  "abv_estimate_pct": <number or null>,
  "concerns": [ "list of red flags, e.g. mold, pellicle, off-color" ],
  "recommendations": [ "next 1-3 actionable steps (rack, pitch more yeast, add nutrient, lower temp, etc.)" ],
  "confidence": "low" | "medium" | "high"
}

Rules:
- If you can't tell, say confidence low and explain in predicted_outcome.
- Brown sugar dumps cause heavy foam early; that's expected.
- Mold = automatic F and "spoiled".`;

    const userMsg = `Product: ${productType}
Stage: ${stage}
${ingredients ? `Ingredients: ${ingredients}` : ""}
${notes ? `User notes: ${notes}` : ""}

Grade this batch from the photo. JSON only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: [
            { type: "text", text: userMsg },
            { type: "image_url", image_url: { url: imageData } },
          ]},
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
    let report;
    try { report = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); report = m ? JSON.parse(m[0]) : {}; }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fermentation-grader error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
