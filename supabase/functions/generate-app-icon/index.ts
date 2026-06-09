import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Color palette per category — keeps the family look consistent
const CATEGORY_COLORS: Record<string, { bg: string; accent: string; symbolHint: string }> = {
  Livestock: { bg: "deep forest green to lime green gradient", accent: "warm cream", symbolHint: "cow silhouette" },
  Welding: { bg: "molten orange to deep red gradient", accent: "bright yellow spark", symbolHint: "welding torch" },
  Farm: { bg: "wheat gold to harvest brown gradient", accent: "soft cream", symbolHint: "tractor or wheat stalk" },
  Calculator: { bg: "electric blue to navy gradient", accent: "white", symbolHint: "calculator grid or numbers" },
  Tools: { bg: "steel gray to charcoal gradient", accent: "safety orange", symbolHint: "wrench or hammer" },
  FFA: { bg: "FFA blue to gold gradient", accent: "corn yellow", symbolHint: "FFA emblem style cross-section of corn" },
  Productivity: { bg: "indigo to purple gradient", accent: "white", symbolHint: "clean abstract checkmark or list" },
  Default: { bg: "deep navy to teal gradient", accent: "white", symbolHint: "clean minimalist abstract symbol" },
};

function pickPalette(category: string) {
  const key = Object.keys(CATEGORY_COLORS).find(k => category?.toLowerCase().includes(k.toLowerCase()));
  return CATEGORY_COLORS[key || "Default"];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { name, category, description } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const palette = pickPalette(category || "");

    // Strict Play-Store-ready icon prompt
    const prompt = `A 1024x1024 square Android Play Store app icon for an app called "${name}".
Category: ${category || "Utility"}.
${description ? `App purpose: ${description.slice(0, 200)}` : ""}

STRICT STYLE RULES (must follow exactly):
- Square format, 1024x1024 pixels
- ${palette.bg} background filling the entire square
- ONE single bold ${palette.accent}-colored centered symbol: ${palette.symbolHint}
- Flat modern minimalist vector style, clean geometric shapes
- Soft inner shadow for depth, slight gradient
- Rounded corners are NOT needed (Play Store applies its own mask)
- NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS anywhere in the image
- NO photorealism, NO 3D rendering, NO complex scenery
- Professional, recognizable at tiny 48x48 sizes
- High contrast, bold silhouette, single focal point
- Style references: Google Material Design icons, Apple Human Interface icons`;

    console.log(`🎨 Generating icon for "${name}" (${category})`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
        temperature: 0.4,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again in a few seconds.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Top up Lovable AI workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: `Generation failed: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image returned:', JSON.stringify(data).slice(0, 300));
      return new Response(JSON.stringify({ error: 'No image generated' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Icon generated for "${name}"`);

    return new Response(JSON.stringify({ icon_url: imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('generate-app-icon error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
