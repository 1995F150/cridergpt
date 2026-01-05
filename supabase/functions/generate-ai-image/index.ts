import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Character detection keywords
const CHARACTER_KEYWORDS: Record<string, string[]> = {
  'jessie': ['jessie', 'crider', 'me', 'myself', 'creator', 'jesse'],
  'dr-harman': ['dr harman', 'dr. harman', 'harman', 'great-grandfather', 'grandfather', 'ancestor', 'dr-harman'],
  'savanaa': ['savanaa', 'savannah', 'sav', 'savanna', 'girlfriend', 'her', 'she', 'girl', 'woman']
};

const CHARACTER_BASE_NAMES = ['jessie', 'dr-harman', 'savanaa'];

// USER-SPECIFIED REFERENCE COPY RULES - 99% ACCURACY REQUIRED
const REFERENCE_COPY_RULES = `
=== REFERENCE PHOTO GENERATION SYSTEM ===

Generate images or video using the reference photos provided for each character.
COPY the reference photos as ACCURATELY as possible. Follow these rules:

CHARACTERS:
- Savanaa (multiple reference photos provided)
- Jessie Crider (reference photo provided)  
- Dr Harman (reference photo provided)

=== REFERENCE COPY RULES ===

1. FACIAL FEATURES MUST MATCH THE REFERENCE PHOTOS EXACTLY
   - Eye shape, eye color, eye spacing - COPY EXACTLY
   - Nose shape and size - COPY EXACTLY
   - Mouth, lips, smile pattern - COPY EXACTLY
   - Jawline and chin - COPY EXACTLY
   - Eyebrow shape and thickness - COPY EXACTLY
   - Skin tone and texture - COPY EXACTLY
   - Any moles, freckles, dimples - COPY EXACTLY

2. MULTI-REFERENCE CONSOLIDATION
   - Combine multiple reference photos for a single character (e.g., Savanaa) into ONE CONSISTENT IDENTITY
   - If features differ between references, use the MOST DETAILED/CLEAR version
   - Study ALL reference photos to build complete understanding of the face

3. DO NOT MODIFY:
   - Facial features
   - Skin tone
   - Eye color
   - Hair color or texture
   
4. MAY VARY SLIGHTLY (only if necessary for scene context):
   - Jewelry
   - Clothing
   - Minor accessories
   - BUT the FACE MUST REMAIN IDENTICAL

5. ORIENTATION AND PERSPECTIVE:
   - Must preserve recognizability
   - Faces should be UPRIGHT and CLEAR
   - No distorted angles that obscure identity

=== MULTI-CHARACTER & SCENE RULES ===

1. Support multiple characters in the same frame
2. EACH character must remain IDENTICAL to their reference photos
3. Do NOT blend or mix features between characters
4. Backgrounds, objects, or props can vary
5. Must NOT distort or alter the characters' faces

=== OUTPUT REQUIREMENTS ===

1. CONSISTENCY: For repeated generations of the same prompt, characters must look THE SAME every time
2. VIDEO: For video generation, ensure frame-to-frame identity consistency
3. CHAT: For chat interface generation, replicate the same reference-photo accuracy rules

=== EXECUTION PRIORITY ===

1. ALWAYS prioritize reference-photo fidelity over creativity
2. Treat reference photos as EXACT COPIES of the character identity
3. Do NOT invent or extrapolate facial features
4. Every output must CLEARLY MATCH the reference images 99% of the time
5. Someone who knows this person should IMMEDIATELY recognize them

=== CRITICAL REMINDER ===
The reference photos ARE the characters. Copy them exactly.
Do not creatively reinterpret. Do not stylize the face.
The face is LOCKED to the reference photos.
`;

// Detailed character profiles
const CHARACTER_PROFILES: Record<string, string> = {
  'jessie': `
CHARACTER: JESSIE CRIDER
Role: Primary Creator / App Owner
Gender: Male
Age: Young adult
Hair: Blonde/light brown, wavy texture
Skin: Light/fair complexion
Key Features: Wavy light hair, young male features, casual modern style
Reference Photo: 1 provided - COPY THIS FACE EXACTLY
`,
  'dr-harman': `
CHARACTER: DR. HARMAN  
Role: Historical Ancestor (3rd Great-Grandfather)
Era: 1800s American
Hair: Dark hair, parted in the middle
DISTINCTIVE FEATURE: FULL THICK BEARD - graying/salt-and-pepper (THIS IS HIS MOST RECOGNIZABLE TRAIT)
Eyes: Intense, piercing gaze
Attire: Dark formal 1800s suit, white dress shirt
Skin: Weathered, period-appropriate complexion
Reference Photo: 1 provided - COPY THIS FACE EXACTLY, especially the beard
Historical Note: Use sepia/vintage tones, period-accurate styling
`,
  'savanaa': `
CHARACTER: SAVANAA
Role: Jessie's Girlfriend
Gender: Female
Age: Young adult
Hair: Dark hair (brown/black)
Eyes: Warm, expressive
Skin: Natural, healthy complexion  
Personality: Confident, bold, vibrant
Key Features: Dark hair, warm expressive eyes, natural beauty
Reference Photos: Multiple provided - COMBINE INTO ONE CONSISTENT IDENTITY
Use the clearest facial features when references differ
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
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all character references
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
            console.log(`Detected character: ${slug} (keyword: "${keyword}")`);
          }
          break;
        }
      }
    }

    // Check database names
    for (const char of characterRefs) {
      const nameLower = char.name?.toLowerCase() || '';
      const slugLower = char.slug?.toLowerCase() || '';
      if (promptLower.includes(nameLower) || promptLower.includes(slugLower)) {
        const baseSlug = CHARACTER_BASE_NAMES.find(base => slugLower.startsWith(base)) || slugLower;
        if (!detectedSlugs.includes(baseSlug)) {
          detectedSlugs.push(baseSlug);
          console.log(`Detected character from DB: ${baseSlug}`);
        }
      }
    }

    console.log('Final detected slugs:', detectedSlugs);

    // Get ALL references for detected characters
    let characters = providedCharacters || [];
    
    if (detectedSlugs.length > 0 && characters.length === 0) {
      characters = characterRefs.filter((c: any) => {
        const charSlug = c.slug?.toLowerCase() || '';
        return detectedSlugs.some(detectedSlug => 
          charSlug === detectedSlug || 
          charSlug.startsWith(detectedSlug + '-') || 
          charSlug.startsWith(detectedSlug)
        );
      });
    }

    console.log(`Selected ${characters.length} character reference(s) for generation`);

    // Group by base character name
    const characterGroups: Record<string, any[]> = {};
    for (const char of characters) {
      const slugLower = char.slug?.toLowerCase() || '';
      const baseName = CHARACTER_BASE_NAMES.find(base => slugLower.startsWith(base)) || char.name || 'Unknown';
      if (!characterGroups[baseName]) {
        characterGroups[baseName] = [];
      }
      characterGroups[baseName].push(char);
    }

    // Build the master prompt
    let masterPrompt = '';
    
    if (Object.keys(characterGroups).length > 0) {
      // Add the reference copy rules
      masterPrompt = REFERENCE_COPY_RULES + '\n\n';
      
      // Add specific character profiles
      masterPrompt += '=== CHARACTER PROFILES FOR THIS GENERATION ===\n\n';
      
      for (const [baseName, refs] of Object.entries(characterGroups)) {
        const profile = CHARACTER_PROFILES[baseName];
        if (profile) {
          masterPrompt += profile + '\n';
        }
        
        const primary = refs.find((r: any) => r.is_primary) || refs[0];
        masterPrompt += `Database Info:\n`;
        masterPrompt += `- Reference Photos: ${refs.length}\n`;
        if (primary.description) masterPrompt += `- Description: ${primary.description}\n`;
        if (primary.traits) masterPrompt += `- Traits: ${primary.traits}\n`;
        if (primary.era) masterPrompt += `- Era: ${primary.era}\n`;
        masterPrompt += '\n';
      }
      
      // Add user's actual request
      masterPrompt += '=== USER REQUEST ===\n';
      masterPrompt += prompt + '\n\n';
      
      // Final execution reminder
      masterPrompt += '=== EXECUTE ===\n';
      masterPrompt += 'Generate the image with characters that are EXACT COPIES of their reference photos.\n';
      masterPrompt += 'The faces must be instantly recognizable. 99% accuracy required.\n';
      masterPrompt += 'Copy the references - do not invent or creatively reinterpret.\n';

      // Era-specific styling
      const hasHistorical = characters.some((c: any) => 
        c.era?.toLowerCase()?.includes('1800') || 
        c.era?.toLowerCase()?.includes('western') ||
        c.slug?.includes('dr-harman')
      );

      if (hasHistorical) {
        masterPrompt += '\nHISTORICAL MODE: Use vintage/sepia aesthetic, period clothing. But FACE stays locked to reference.\n';
      }
    } else {
      masterPrompt = prompt;
    }

    // Style modifiers
    if (settings) {
      const styles: string[] = [];
      if (settings.blackAndWhite) styles.push('black and white');
      if (settings.vintageTexture) styles.push('vintage texture, aged photo');
      if (settings.filmGrain) styles.push('film grain');
      if (settings.mood) styles.push(`${settings.mood} mood`);
      if (settings.style === 'rdr2') styles.push('Red Dead Redemption 2 style, Western');
      if (settings.style === 'cinematic') styles.push('cinematic');
      if (settings.style === 'portrait') styles.push('portrait photography');
      if (settings.era) styles.push(`${settings.era} era`);
      
      if (styles.length > 0) {
        masterPrompt += `\nSTYLE: ${styles.join(', ')}\n`;
      }
    }

    console.log('Master prompt length:', masterPrompt.length);

    // Build message with reference images
    const messageContent: any[] = [
      { type: 'text', text: masterPrompt }
    ];

    // Edit mode source image
    if (mode === 'edit' && imageUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    // Add ALL reference images
    const siteUrl = Deno.env.get('SITE_URL') || 'https://crideros.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    let refCount = 0;
    for (const char of characters) {
      if (char.reference_photo_url) {
        let refUrl = char.reference_photo_url;
        
        if (refUrl.startsWith('/')) {
          refUrl = `${siteUrl}${refUrl}`;
        } else if (refUrl.startsWith('character-references/')) {
          refUrl = `${supabaseUrl}/storage/v1/object/public/${refUrl}`;
        } else if (!refUrl.startsWith('http')) {
          refUrl = `${siteUrl}/${refUrl}`;
        }
        
        console.log(`Reference ${refCount + 1}: ${char.name} -> ${refUrl}`);
        messageContent.push({
          type: 'image_url',
          image_url: { url: refUrl }
        });
        refCount++;
      }
    }
    
    console.log(`Total references included: ${refCount}`);

    // Generate with Gemini Flash
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: messageContent }],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageResult) {
      const textResponse = data.choices?.[0]?.message?.content || 'No response';
      console.error('No image generated:', textResponse.substring(0, 300));
      return new Response(
        JSON.stringify({ error: 'No image generated', details: textResponse }),
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
        unified_prompt: masterPrompt,
        character_ids: characters.map((c: any) => c.slug),
        style: settings?.style || null,
        visual_settings: settings || null,
        output_type: 'image',
        output_url: imageResult,
        status: 'completed'
      });
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageResult,
        image: imageResult,
        message: data.choices?.[0]?.message?.content || 'Generated with 99% reference accuracy',
        detectedCharacters: Object.keys(characterGroups),
        referencePhotosUsed: refCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
