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
  'savanaa': ['savanaa', 'savannah', 'sav', 'savanna', 'girlfriend', 'her', 'she', 'girl', 'woman']
};

// Base character names for grouping references
const CHARACTER_BASE_NAMES = ['jessie', 'dr-harman', 'savanaa'];

// Strict identity rules for character generation
const IDENTITY_RULES = `
CRITICAL CHARACTER IDENTITY RULES - MUST FOLLOW:

1. FACIAL IDENTITY IS LOCKED: The facial features of each character MUST match the reference photos with 99% accuracy.
   - Skin tone, facial structure, eye color, nose, mouth, and jawline must be EXACTLY as shown in references.
   - Do NOT creatively reinterpret facial features - the reference photos DEFINE identity.

2. MULTI-REFERENCE CONSOLIDATION: When multiple reference photos exist for a character (like Savanaa with 3 photos),
   combine them into a single unified identity. Use the highest-quality facial features when discrepancies exist.

3. CONSISTENCY ACROSS GENERATIONS: Use deterministic generation to ensure repeated prompts yield visually consistent results.
   Orientation must be correct (faces upright and readable).

4. SCENE FLEXIBILITY: Backgrounds, lighting, environments, clothing, and accessories may vary based on context.
   Props and scenery are optional. BUT facial features must NEVER be altered to fit the scene.

5. MULTI-CHARACTER SCENES: When generating multiple characters in one frame, EACH character must maintain
   their reference-locked identity. No mixing of features between characters.

6. VIDEO/FRAME CONSISTENCY: For video or multi-frame generation, apply the same accuracy rules frame-to-frame.
   Character identity must remain locked throughout all frames.
`;

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
    console.log('Loaded', characterRefs.length, 'character references from database');

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
      if (promptLower.includes(nameLower) || promptLower.includes(slugLower)) {
        const baseSlug = CHARACTER_BASE_NAMES.find(base => slugLower.startsWith(base)) || slugLower;
        if (!detectedSlugs.includes(baseSlug)) {
          detectedSlugs.push(baseSlug);
        }
      }
    }

    console.log('Detected character base slugs:', detectedSlugs);

    // Get ALL character references for detected characters (includes all reference photos)
    let characters = providedCharacters || [];
    
    if (detectedSlugs.length > 0 && characters.length === 0) {
      characters = characterRefs.filter(c => {
        const charSlug = c.slug?.toLowerCase() || '';
        return detectedSlugs.some(detectedSlug => 
          charSlug === detectedSlug || charSlug.startsWith(detectedSlug + '-')
        );
      });
    }

    console.log('Using characters with references:', characters.map((c: any) => `${c.name} (${c.slug})`));

    // Group characters by name to consolidate reference info
    const characterGroups: Record<string, any[]> = {};
    for (const char of characters) {
      const name = char.name || 'Unknown';
      if (!characterGroups[name]) {
        characterGroups[name] = [];
      }
      characterGroups[name].push(char);
    }

    // Build enhanced prompt with strict identity rules
    let enhancedPrompt = '';
    
    // Always include identity rules when characters are detected
    if (Object.keys(characterGroups).length > 0) {
      enhancedPrompt = IDENTITY_RULES + '\n\n';
      
      // Add detailed character descriptions
      const charDescriptions = Object.entries(characterGroups).map(([name, refs]) => {
        const primary = refs.find((r: any) => r.is_primary) || refs[0];
        const refCount = refs.length;
        
        let desc = `CHARACTER: ${name.toUpperCase()}`;
        desc += `\n- Reference Photos: ${refCount} (STUDY ALL REFERENCES to establish unified identity)`;
        if (primary.pronouns) desc += `\n- Pronouns: ${primary.pronouns}`;
        if (primary.description) desc += `\n- Physical Description: ${primary.description}`;
        if (primary.traits) desc += `\n- Key Traits: ${primary.traits}`;
        if (primary.context) desc += `\n- Character Context: ${primary.context}`;
        if (primary.era) desc += `\n- Era/Period: ${primary.era}`;
        desc += `\n- PRIORITY: Match facial features with 99% accuracy. Skin tone, facial structure, eye color, nose, mouth, and jawline MUST match references exactly.`;
        
        return desc;
      }).join('\n\n');
      
      enhancedPrompt += `CHARACTERS TO GENERATE:\n${charDescriptions}\n\n`;
      enhancedPrompt += `USER REQUEST: ${prompt}\n\n`;
      enhancedPrompt += `EXECUTION: Generate the image with the character(s) having EXACT likeness to their reference photos. The faces are LOCKED to the references - do not creatively reinterpret them.`;

      // Apply era-specific styling
      const hasHistorical = characters.some((c: any) => 
        c.era?.toLowerCase().includes('1900') || 
        c.era?.toLowerCase().includes('western') ||
        c.era?.toLowerCase().includes('historical')
      );

      if (hasHistorical) {
        enhancedPrompt += '\n\nHISTORICAL ACCURACY: Use period-appropriate clothing, settings, and aesthetics for historical characters. Apply vintage photo texture and sepia/B&W tones unless color explicitly requested.';
      }
    } else {
      // No characters detected - standard generation
      enhancedPrompt = prompt;
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
      enhancedPrompt += `\n\nSTYLE: ${styleModifiers.join(', ')}`;
    }

    console.log('Final enhanced prompt length:', enhancedPrompt.length);
    console.log('Prompt preview:', enhancedPrompt.substring(0, 800) + '...');

    // Build the message content with reference images
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];

    // If editing mode with image, include the source image
    if (mode === 'edit' && imageUrl) {
      console.log('Edit mode: including source image');
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    // Include ALL character reference images for accurate identity matching
    const siteUrl = Deno.env.get('SITE_URL') || 'https://crideros.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    let refImagesAdded = 0;
    for (const char of characters) {
      if (char.reference_photo_url) {
        let refUrl = char.reference_photo_url;
        
        // Handle different URL formats
        if (refUrl.startsWith('/')) {
          // Relative URL - point to public folder
          refUrl = `${siteUrl}${refUrl}`;
        } else if (refUrl.startsWith('character-references/')) {
          // Storage path - construct full Supabase storage URL
          refUrl = `${supabaseUrl}/storage/v1/object/public/${refUrl}`;
        }
        
        console.log(`Adding reference ${refImagesAdded + 1} for ${char.name} (${char.slug}): ${refUrl}`);
        messageContent.push({
          type: 'image_url',
          image_url: { url: refUrl }
        });
        refImagesAdded++;
      }
    }
    
    console.log(`Total reference images included: ${refImagesAdded}`);

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
      console.error('No image in response. Text response:', textResponse.substring(0, 300));
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
      console.log('Generation logged for user:', userId);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageUrlResult,
        image: imageUrlResult,
        message: data.choices?.[0]?.message?.content || 'Image generated with reference-locked character identity',
        detectedCharacters: Object.keys(characterGroups),
        referencePhotosUsed: refImagesAdded
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
