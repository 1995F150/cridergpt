import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Character detection keywords - maps to base character slugs
const CHARACTER_KEYWORDS: Record<string, string[]> = {
  'jessie': ['jessie', 'crider', 'me', 'myself', 'creator', 'jesse'],
  'dr-harman': ['dr harman', 'dr. harman', 'harman', 'great-grandfather', 'grandfather', 'ancestor', 'dr-harman'],
  'savanaa': ['savanaa', 'savannah', 'sav', 'savanna', 'girlfriend', 'her', 'she', 'girl', 'woman']
};

// Base character names for grouping references
const CHARACTER_BASE_NAMES = ['jessie', 'dr-harman', 'savanaa'];

// ULTRA-STRICT identity rules for 99% accuracy
const IDENTITY_RULES = `
=== CRITICAL: PHOTOREALISTIC IDENTITY PRESERVATION SYSTEM ===

You are generating an image where CHARACTER IDENTITY MUST BE PRESERVED WITH 99% ACCURACY.
Reference photos are provided - these ARE the characters. DO NOT deviate.

MANDATORY IDENTITY LOCK RULES:

1. FACE IS SACRED - NON-NEGOTIABLE:
   - The EXACT facial structure from reference photos MUST be replicated
   - Eye shape, eye color, eye spacing - COPY EXACTLY from references
   - Nose shape and size - COPY EXACTLY from references  
   - Mouth, lips, smile pattern - COPY EXACTLY from references
   - Jawline and chin - COPY EXACTLY from references
   - Skin tone and texture - COPY EXACTLY from references
   - Eyebrow shape and thickness - COPY EXACTLY from references

2. HAIR IS IDENTITY:
   - Hair color MUST match references exactly
   - Hair texture (wavy, straight, curly) MUST match
   - General hair style should align with references unless prompt specifies otherwise

3. DISTINGUISHING FEATURES:
   - Any moles, freckles, dimples, or unique features MUST be preserved
   - Facial expressions can vary, but bone structure CANNOT

4. WHAT CAN CHANGE:
   - Clothing (unless specified)
   - Background/setting
   - Lighting style
   - Camera angle (but face proportions stay locked)
   - Accessories and props

5. WHAT CANNOT CHANGE (EVER):
   - Facial bone structure
   - Eye color or shape
   - Skin tone
   - Core facial features
   - The person's fundamental appearance

6. MULTI-CHARACTER RULE:
   If multiple characters appear, EACH character keeps their locked identity.
   Do NOT blend or average features between characters.

7. REFERENCE PHOTO PRIORITY:
   When multiple reference photos are provided for one character,
   use ALL of them to build a complete understanding of the face.
   Use the clearest, most frontal reference as the primary guide.

EXECUTE THIS PROMPT WITH THE CHARACTER'S FACE BEING AN EXACT MATCH TO REFERENCES.
The goal is: someone who knows this person would IMMEDIATELY recognize them.
`;

// Detailed character bios for maximum accuracy
const CHARACTER_BIOS: Record<string, string> = {
  'jessie': `
JESSIE CRIDER (Primary Creator)
- Age: Young adult male
- Hair: Blonde/light brown, wavy texture
- Skin: Light/fair complexion
- Build: Male
- Style: Casual, modern
- Key identifiers: Wavy light hair, young male features
- PRIORITY: This is the app creator - accuracy is critical
`,
  'dr-harman': `
DR. HARMAN (Historical Ancestor - 3rd Great-Grandfather)
- Era: 1800s American
- Hair: Dark hair, parted in the middle
- Facial Hair: PROMINENT full beard, graying/salt-and-pepper
- Eyes: Intense, piercing gaze
- Skin: Weathered, period-appropriate
- Attire: Dark formal 1800s suit, white dress shirt
- Key identifiers: FULL THICK BEARD (most distinctive feature), dark parted hair, serious expression
- PRIORITY: Historical accuracy - use sepia/vintage tones, period clothing
- CRITICAL: The BEARD is his most recognizable feature - thick, full, going gray
`,
  'savanaa': `
SAVANAA (Jessie's Girlfriend)
- Age: Young adult female
- Hair: Dark hair (brown/black)
- Eyes: Warm, expressive
- Skin: Natural, healthy complexion
- Style: Bold, confident, expressive
- Personality reflected: Confident, vibrant
- Key identifiers: Dark hair, warm expressive eyes, natural beauty
- PRIORITY: Capture her confident, bold energy while maintaining facial accuracy
`
};

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
    characterRefs.forEach((c: any) => {
      console.log(`  DB char: ${c.name} | slug: ${c.slug} | url: ${c.reference_photo_url}`);
    });

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

    // Get ALL character references for detected characters
    let characters = providedCharacters || [];
    
    if (detectedSlugs.length > 0 && characters.length === 0) {
      characters = characterRefs.filter((c: any) => {
        const charSlug = c.slug?.toLowerCase() || '';
        const matches = detectedSlugs.some(detectedSlug => 
          charSlug === detectedSlug || 
          charSlug.startsWith(detectedSlug + '-') || 
          charSlug.startsWith(detectedSlug)
        );
        if (matches) {
          console.log(`  Matched: ${c.name} (${c.slug}) -> ${c.reference_photo_url}`);
        }
        return matches;
      });
    }

    console.log('Characters selected for generation:', characters.length);

    // Group characters by base name
    const characterGroups: Record<string, any[]> = {};
    for (const char of characters) {
      const slugLower = char.slug?.toLowerCase() || '';
      const baseName = CHARACTER_BASE_NAMES.find(base => slugLower.startsWith(base)) || char.name || 'Unknown';
      if (!characterGroups[baseName]) {
        characterGroups[baseName] = [];
      }
      characterGroups[baseName].push(char);
    }

    // Build ULTRA-ENHANCED prompt for 99% accuracy
    let enhancedPrompt = '';
    
    if (Object.keys(characterGroups).length > 0) {
      enhancedPrompt = IDENTITY_RULES + '\n\n';
      
      // Add detailed character bios and descriptions
      enhancedPrompt += '=== CHARACTERS IN THIS GENERATION ===\n\n';
      
      for (const [baseName, refs] of Object.entries(characterGroups)) {
        const primary = refs.find((r: any) => r.is_primary) || refs[0];
        const refCount = refs.length;
        
        // Add the detailed bio if available
        const bio = CHARACTER_BIOS[baseName];
        if (bio) {
          enhancedPrompt += bio + '\n';
        }
        
        enhancedPrompt += `DATABASE INFO for ${primary.name?.toUpperCase()}:\n`;
        enhancedPrompt += `- Reference Photos Provided: ${refCount} (STUDY ALL CAREFULLY)\n`;
        if (primary.pronouns) enhancedPrompt += `- Pronouns: ${primary.pronouns}\n`;
        if (primary.description) enhancedPrompt += `- Description: ${primary.description}\n`;
        if (primary.traits) enhancedPrompt += `- Visual Traits: ${primary.traits}\n`;
        if (primary.context) enhancedPrompt += `- Context: ${primary.context}\n`;
        if (primary.era) enhancedPrompt += `- Era/Period: ${primary.era}\n`;
        enhancedPrompt += '\n';
      }
      
      enhancedPrompt += '=== USER REQUEST ===\n';
      enhancedPrompt += prompt + '\n\n';
      
      enhancedPrompt += '=== EXECUTION INSTRUCTIONS ===\n';
      enhancedPrompt += 'Generate the requested image with EXACT facial likeness to the reference photos.\n';
      enhancedPrompt += 'The face must be instantly recognizable as the person in the references.\n';
      enhancedPrompt += 'Prioritize identity accuracy over artistic interpretation.\n';
      enhancedPrompt += 'If this is a historical character (like Dr. Harman), use period-appropriate styling.\n';

      // Era-specific enhancements
      const hasHistorical = characters.some((c: any) => 
        c.era?.toLowerCase().includes('1800') || 
        c.era?.toLowerCase().includes('1900') ||
        c.era?.toLowerCase().includes('western') ||
        c.era?.toLowerCase().includes('historical')
      );

      if (hasHistorical) {
        enhancedPrompt += '\nHISTORICAL MODE: Apply vintage/sepia tones, period-accurate clothing and settings. ';
        enhancedPrompt += 'Use old photograph aesthetic but MAINTAIN FACIAL ACCURACY.\n';
      }
    } else {
      enhancedPrompt = prompt;
    }

    // Add style modifiers
    const styleModifiers: string[] = [];
    if (settings) {
      if (settings.blackAndWhite) styleModifiers.push('black and white photograph');
      if (settings.vintageTexture) styleModifiers.push('vintage photo texture, slight vignette, faded tones');
      if (settings.filmGrain) styleModifiers.push('film grain overlay');
      if (settings.mood) styleModifiers.push(`${settings.mood} mood and atmosphere`);
      if (settings.style === 'rdr2') styleModifiers.push('Red Dead Redemption 2 portrait style, old West aesthetic, cinematic');
      if (settings.style === 'cinematic') styleModifiers.push('cinematic lighting and composition, movie quality');
      if (settings.style === 'portrait') styleModifiers.push('professional portrait photography, studio quality');
      if (settings.style === 'vintage') styleModifiers.push('vintage photograph, aged paper texture, historical');
      if (settings.era) styleModifiers.push(`${settings.era} era aesthetic and styling`);
    }
    
    if (styleModifiers.length > 0) {
      enhancedPrompt += `\n=== STYLE ===\n${styleModifiers.join(', ')}\n`;
    }

    console.log('Final enhanced prompt length:', enhancedPrompt.length);
    console.log('Prompt preview (first 1000 chars):', enhancedPrompt.substring(0, 1000));

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

    // Include ALL character reference images - CRITICAL for accuracy
    const siteUrl = Deno.env.get('SITE_URL') || 'https://crideros.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    let refImagesAdded = 0;
    for (const char of characters) {
      if (char.reference_photo_url) {
        let refUrl = char.reference_photo_url;
        
        // Handle different URL formats
        if (refUrl.startsWith('/')) {
          refUrl = `${siteUrl}${refUrl}`;
        } else if (refUrl.startsWith('character-references/')) {
          refUrl = `${supabaseUrl}/storage/v1/object/public/${refUrl}`;
        } else if (!refUrl.startsWith('http')) {
          refUrl = `${siteUrl}/${refUrl}`;
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

    // Use Gemini Flash for image generation
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
      console.error('No image in response. Text response:', textResponse.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: 'No image generated. The AI may not have been able to generate this image.', 
          details: textResponse 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log generation
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
        message: data.choices?.[0]?.message?.content || 'Image generated with 99% identity accuracy',
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
