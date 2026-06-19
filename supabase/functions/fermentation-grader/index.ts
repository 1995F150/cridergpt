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

    const system = `You are a careful, conservative home fermentation expert grading a photo of fermenting must/wort/cider.
Accuracy matters more than optimism. If you can't tell something from the photo, say so — don't guess high.

What to actually look at in the image:
- Krausen / foam: thickness, density, color, uniformity. Thick tan/brown krausen on fruit wine = very active. Thin film or no foam late in primary = stalled or finished.
- Bubble pattern: tight small bubbles (healthy CO2) vs. large popping bubbles (slowing) vs. flat surface.
- Liquid color and clarity: cloudy = yeast in suspension (active). Layered/clearing = settling. Pink/purple foam on grape is normal.
- Headspace: is there room for the krausen to rise, or is it about to blow the lid?
- Red flags (auto-lower grade or fail): fuzzy white/green/black mold spots, dry leathery pellicle film, oily rainbow slick, dark ring above liquid line that looks fuzzy, vinegar-looking surface.
- Container: sealed jug vs. open bucket vs. juice bottle with loose cap. Sealed with no airlock during active ferment = pressure risk, mention it.

Sugar / ABV reasoning rules (be honest about uncertainty):
- The user often does NOT measure sugar exactly ("a few spoonfuls", "a couple cups"). Treat ingredient text as approximate.
- Do NOT invent a precise ABV. If you have no SG reading, give a wide range (e.g. "~8-13% ABV likely") or null, and put it in predicted_outcome instead of pretending precision.
- "More sugar = more alcohol" is only true up to the yeast's tolerance (bread yeast ~8-12%, wine yeast ~14-18%). Past that, extra sugar stays sweet and can stall the yeast. Call this out when relevant.
- Brown sugar adds molasses flavor and minor nutrients but is not a substitute for yeast nutrient.

Grading scale (be strict, not generous):
- A (90-100): textbook healthy active ferment, no concerns, on track for a good outcome.
- B (75-89): healthy but with one minor issue (headspace tight, slow start, slight off-color) — still going to turn out fine.
- C (60-74): working but with real concerns (possible under-pitch, wrong yeast for sugar load, sealed container, questionable sanitation visible).
- D (40-59): likely problem batch — stalled, off-smell implied by appearance, mixed signals.
- F (0-39): spoiled. Mold, pellicle, vinegar mother, obvious contamination.
Default to B for "looks fine but I can't be 100% sure from one photo." Reserve A for clearly textbook batches.

Return STRICT JSON only, no markdown fences:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "score": <0-100 integer>,
  "stage_observed": "lag" | "active" | "peak" | "slowing" | "stalled" | "finished" | "spoiled",
  "predicted_outcome": "2-3 sentences. Be specific about what you see. Mention sugar/ABV uncertainty if ingredients are vague.",
  "fermentation_health": "what the foam/bubbles/color actually look like in this photo",
  "abv_estimate_pct": <number, or null if you truly can't tell>,
  "abv_range_pct": "e.g. '8-12%' or null",
  "concerns": [ "specific red flags you can see, or empty array if none" ],
  "recommendations": [ "next 1-3 concrete steps (rack, pitch nutrient, swap to airlock, give headspace, take SG reading, etc.)" ],
  "confidence": "low" | "medium" | "high"
}

Confidence rules:
- "high" only if photo is clear, stage is obvious, and ingredients/stage text matches what you see.
- "medium" is the default.
- "low" if blurry, dark, weird angle, or the photo doesn't actually show the fermentation surface.

Never flatter the user. If the setup looks risky (e.g. sealed juice bottle, no airlock, no measured sugar), say so in concerns.`;


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
