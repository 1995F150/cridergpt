import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Character detection keywords - maps to base character slugs
const CHARACTER_KEYWORDS: Record<string, string[]> = {
  'jessie': ['jessie', 'crider', 'me', 'myself', 'creator'],
  'dr-harman': ['dr harman', 'dr. harman', 'harman', 'great-grandfather', 'grandfather', 'ancestor'],
  'savanaa': ['savanaa', 'savannah', 'sav', 'savanna', 'girlfriend', 'her', 'she']
};

// Base character names for grouping references
const CHARACTER_BASE_NAMES = ['jessie', 'dr-harman', 'savanaa'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { prompt, characters: providedCharacters, settings, mode, imageUrl } = await req.json();

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

    // Fetch all character references from database
    const { data: allCharacters, error: charError } = await supabase
      .from('character_references')
      .select('*');

    if (charError) {
      console.error('Error fetching characters:', charError);
    }

    const characterRefs = allCharacters || [];
    console.log('Loaded', characterRefs.length, 'character references');

    // Auto-detect characters from prompt
    const promptLower = prompt.toLowerCase();
    const detectedSlugs: string[] = [];

    for (const [slug, keywords] of Object.entries(CHARACTER_KEYWORDS)) {
      for (const keyword of keywords) {
        if (promptLower.includes(keyword)) {
          if (!detectedSlugs.includes(slug)) {
            detectedSlugs.push(slug);
          }
          break;
        }
      }
    }

  // Also check character names directly from database
  for (const char of characterRefs) {
    const nameLower = char.name?.toLowerCase() || '';
    const slugLower = char.slug?.toLowerCase() || '';
    // Check if prompt mentions this character
    if (promptLower.includes(nameLower) || promptLower.includes(slugLower)) {
      // Find the base slug (e.g., 'savanaa' from 'savanaa-2')
      const baseSlug = CHARACTER_BASE_NAMES.find(base => slugLower.startsWith(base)) || slugLower;
      if (!detectedSlugs.includes(baseSlug)) {
        detectedSlugs.push(baseSlug);
      }
    }
  }

  console.log('Detected character slugs:', detectedSlugs);

  // Get ALL character references for detected characters (includes multiple reference photos)
  let characters = providedCharacters || [];
  
  if (detectedSlugs.length > 0 && characters.length === 0) {
    // Get all references that match the base slug (e.g., savanaa, savanaa-2, savanaa-3, etc.)
    characters = characterRefs.filter(c => {
      const charSlug = c.slug?.toLowerCase() || '';
      return detectedSlugs.some(detectedSlug => 
        charSlug === detectedSlug || charSlug.startsWith(detectedSlug + '-')
      );
    });
  }

  console.log('Using characters:', characters.map((c: any) => `${c.name} (${c.slug})`));

  // Group characters by name to consolidate reference info
  const characterGroups: Record<string, any[]> = {};
  for (const char of characters) {
    const name = char.name || 'Unknown';
    if (!characterGroups[name]) {
      characterGroups[name] = [];
    }
    characterGroups[name].push(char);
  }

  // Build enhanced prompt with character context (use primary entry for description)
  let enhancedPrompt = prompt;
  
  if (Object.keys(characterGroups).length > 0) {
    const charDescriptions = Object.entries(characterGroups).map(([name, refs]) => {
      // Use the first/primary reference for description
      const primary = refs.find((r: any) => r.is_primary) || refs[0];
      let desc = `[Character: ${name}`;
      if (primary.pronouns) desc += ` (${primary.pronouns})`;
      if (primary.traits) desc += ` - ${primary.traits}`;
      if (primary.description) desc += `. ${primary.description}`;
      if (primary.context) desc += `. ${primary.context}`;
      if (primary.era) desc += `. Era: ${primary.era}`;
      desc += `. Reference photos available: ${refs.length}]`;
      return desc;
    }).join('\n');
    
    enhancedPrompt = `${charDescriptions}\n\nIMPORTANT: Generate the character(s) with EXACT likeness to the reference photos provided. Match facial features, hair, and overall appearance precisely.\n\nGenerate an image of: ${prompt}`;

    // Apply era-specific defaults
    const hasHistorical = characters.some((c: any) => 
      c.era?.toLowerCase().includes('1900') || 
      c.era?.toLowerCase().includes('western') ||
      c.era?.toLowerCase().includes('historical')
    );

    if (hasHistorical) {
      enhancedPrompt += '\n\nHistorical accuracy required: Use period-appropriate clothing, settings, and aesthetics. Apply vintage photo texture and sepia/B&W tones unless color explicitly requested.';
    }
  }

    // Add style modifiers
    const styleModifiers: string[] = [];
    if (settings) {
      if (settings.blackAndWhite) styleModifiers.push('black and white photograph');
      if (settings.vintageTexture) styleModifiers.push('vintage photo texture, slight vignette, faded tones');
      if (settings.filmGrain) styleModifiers.push('film grain overlay');
      if (settings.mood) styleModifiers.push(`${settings.mood} mood`);
      if (settings.style === 'rdr2') styleModifiers.push('Red Dead Redemption 2 portrait style, old West aesthetic');
      if (settings.style === 'cinematic') styleModifiers.push('cinematic lighting and composition');
      if (settings.era) styleModifiers.push(`${settings.era} era aesthetic`);
    }
    
    if (styleModifiers.length > 0) {
      enhancedPrompt += `\n\nStyle: ${styleModifiers.join(', ')}`;
    }

    console.log('Generating image with prompt:', enhancedPrompt.substring(0, 500) + '...');

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

    // Include character reference images for better accuracy
    // Get the site URL for constructing absolute URLs to public folder images
    const siteUrl = Deno.env.get('SITE_URL') || 'https://crideros.lovable.app';
    
    for (const char of characters) {
      if (char.reference_photo_url) {
        // Convert relative URLs to absolute URLs pointing to the public folder
        let refUrl = char.reference_photo_url;
        if (refUrl.startsWith('/')) {
          refUrl = `${siteUrl}${refUrl}`;
        }
        console.log(`Adding reference image for ${char.name} (${char.slug}): ${refUrl}`);
        messageContent.push({
          type: 'image_url',
          image_url: { url: refUrl }
        });
      }
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
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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

    // Log generation to media_generations table
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      } catch {}
    }

    if (userId) {
      await supabase.from('media_generations').insert({
        user_id: userId,
        prompt: prompt,
        unified_prompt: enhancedPrompt,
        character_ids: characters.map((c: any) => c.slug),
        style: settings?.style || null,
        visual_settings: settings || null,
        output_type: 'image',
        output_url: imageUrlResult,
        status: 'completed'
      });
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageUrlResult,
        image: imageUrlResult, // For backwards compatibility
        message: data.choices?.[0]?.message?.content || 'Image generated successfully',
        detectedCharacters: characters.map((c: any) => c.name)
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
