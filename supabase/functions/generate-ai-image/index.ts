import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, characters, settings, mode, imageUrl } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build enhanced prompt with character context
    let enhancedPrompt = prompt;
    
    if (characters && characters.length > 0) {
      const charDescriptions = characters.map((c: any) => {
        let desc = `[Character: ${c.name}`;
        if (c.traits) desc += ` - ${c.traits}`;
        if (c.context) desc += `. ${c.context}`;
        desc += ']';
        return desc;
      }).join('\n');
      
      enhancedPrompt = `${charDescriptions}\n\nGenerate an image of: ${prompt}`;
    }

    // Add style modifiers
    if (settings) {
      const styleModifiers: string[] = [];
      if (settings.blackAndWhite) styleModifiers.push('black and white photograph');
      if (settings.vintageTexture) styleModifiers.push('vintage photo texture, slight vignette, faded tones');
      if (settings.filmGrain) styleModifiers.push('film grain overlay');
      if (settings.mood) styleModifiers.push(`${settings.mood} mood`);
      if (settings.style === 'rdr2') styleModifiers.push('Red Dead Redemption 2 portrait style, old West aesthetic');
      if (settings.style === 'cinematic') styleModifiers.push('cinematic lighting and composition');
      
      if (styleModifiers.length > 0) {
        enhancedPrompt += `\n\nStyle: ${styleModifiers.join(', ')}`;
      }
    }

    console.log('Generating image with prompt:', enhancedPrompt.substring(0, 300) + '...');

    // Build the message content
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];

    // If editing mode with image, include the source image
    if (mode === 'edit' && imageUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    // Use Gemini Flash for image generation via Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}. ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI Gateway response received');

    // Extract image from response
    const imageUrlResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrlResult) {
      const textResponse = data.choices?.[0]?.message?.content || 'No response';
      console.error('No image in response. Text response:', textResponse.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          error: 'No image generated. The AI may not have been able to generate this image.', 
          details: textResponse 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageUrlResult,
        image: imageUrlResult, // For backwards compatibility
        message: data.choices?.[0]?.message?.content || 'Image generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-image:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
