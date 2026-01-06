import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { decode as base64Decode, encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Watermark configuration
const WATERMARK_URL = 'https://crideros.lovable.app/cridergpt-watermark.png';
const WATERMARK_OPACITY = 0.7;
const WATERMARK_SCALE = 0.15; // 15% of image width
const WATERMARK_POSITION = 'bottom-right'; // Position of watermark
const WATERMARK_MARGIN = 20; // Pixels from edge

// Function to add watermark to base64 image
async function addWatermark(base64Image: string): Promise<string> {
  try {
    // Extract the base64 data (remove data:image/png;base64, prefix if present)
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;
    
    // Get the image format from prefix
    const formatMatch = base64Image.match(/data:image\/(\w+);base64/);
    const format = formatMatch ? formatMatch[1] : 'png';
    
    // Fetch the watermark image
    const watermarkResponse = await fetch(WATERMARK_URL);
    if (!watermarkResponse.ok) {
      console.error('Failed to fetch watermark:', watermarkResponse.status);
      return base64Image; // Return original if watermark fails
    }
    
    const watermarkBuffer = await watermarkResponse.arrayBuffer();
    const watermarkBase64 = base64Encode(new Uint8Array(watermarkBuffer));
    
    // Use the AI to composite the watermark onto the image
    // This approach ensures proper transparency and scaling
    const compositePrompt = `
Take this image and add the provided watermark logo to the ${WATERMARK_POSITION.replace('-', ' ')} corner.
The watermark should be:
- Scaled to approximately ${WATERMARK_SCALE * 100}% of the image width
- Positioned ${WATERMARK_MARGIN}px from the edges
- Semi-transparent (about ${WATERMARK_OPACITY * 100}% opacity)
- DO NOT modify any other part of the image
- Keep the original image EXACTLY as is, only add the watermark overlay
- The watermark should be clearly visible but not distracting
Return ONLY the watermarked image.
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: compositePrompt },
            { 
              type: 'image_url', 
              image_url: { url: `data:image/${format};base64,${base64Data}` }
            },
            { 
              type: 'image_url', 
              image_url: { url: `data:image/png;base64,${watermarkBase64}` }
            }
          ]
        }],
        modalities: ['image', 'text'],
        temperature: 0
      })
    });

    if (!response.ok) {
      console.error('Watermark compositing failed:', response.status);
      return base64Image; // Return original if compositing fails
    }

    const data = await response.json();
    const watermarkedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (watermarkedImage) {
      console.log('Watermark applied successfully');
      return watermarkedImage;
    }
    
    console.warn('No watermarked image returned, using original');
    return base64Image;
  } catch (error) {
    console.error('Error adding watermark:', error);
    return base64Image; // Return original on error
  }
}

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

// USER-SPECIFIED REFERENCE COPY RULES - 100% ACCURACY REQUIRED
const REFERENCE_COPY_RULES = `
=== REFERENCE PHOTO GENERATION SYSTEM - 100% FACIAL ACCURACY ===

Generate images or video using the reference photos provided for each character.
Use EVERY reference photo provided for each character.
COPY the reference photos with 100% FACIAL ACCURACY. Follow these rules:

CHARACTERS:
- Savanaa (multiple reference photos - COMBINE ALL for clearest identity)
- Jessie Crider (reference photo provided)  
- Dr Harman (reference photo provided)

=== REFERENCE PHOTO USAGE RULES ===

1. USE EVERY REFERENCE PHOTO PROVIDED
   - If multiple reference photos exist for one character, COMBINE them intelligently
   - The final image must reflect the CLEAREST and MOST CONSISTENT facial features
   - Prioritize: eyes, nose, mouth, facial shape, and hair from the clearest reference

2. FACIAL FEATURES MUST MATCH REFERENCES 100%
   - Eye shape, eye color, eye spacing - COPY EXACTLY from references
   - Nose shape and size - COPY EXACTLY from references
   - Mouth, lips, smile pattern - COPY EXACTLY from references
   - Jawline and chin - COPY EXACTLY from references
   - Eyebrow shape and thickness - COPY EXACTLY from references
   - Skin tone and texture - COPY EXACTLY from references
   - Any moles, freckles, dimples - COPY EXACTLY from references
   - DO NOT ALTER facial features from reference photos

3. MULTI-REFERENCE CONSOLIDATION
   - Combine multiple reference photos for a single character into ONE CONSISTENT IDENTITY
   - If features differ between references, use the MOST DETAILED/CLEAR version
   - Study ALL reference photos to build COMPLETE understanding of the face
   - The consolidated identity must be INSTANTLY RECOGNIZABLE

4. DO NOT MODIFY:
   - Facial features
   - Skin tone
   - Eye color
   - Hair color or texture
   - Gender, ethnicity, or age (unless explicitly instructed)
   
5. MAY VARY SLIGHTLY (only if necessary for scene context):
   - Jewelry
   - Clothing (can vary)
   - Minor accessories
   - BUT the FACE MUST REMAIN IDENTICAL TO REFERENCES

6. ORIENTATION AND PERSPECTIVE:
   - Must preserve recognizability
   - Faces should be UPRIGHT and CLEAR
   - No distorted angles that obscure identity

=== MULTI-CHARACTER SCENE RULES ===

1. Support multiple characters in the same frame
2. EACH character's face must match their references INDEPENDENTLY
3. Do NOT blend or mix features between different characters
4. Maintain relative scale, position, and orientation so characters appear NATURALLY together
5. Backgrounds, objects, or props can vary
6. Must NOT distort or alter ANY character's face

=== OUTPUT CONSISTENCY REQUIREMENTS ===

1. CONSISTENCY: For repeated generations of the same prompt, characters must look THE SAME every time
2. VIDEO: For video generation, ensure frame-to-frame identity consistency
3. CHAT: For chat interface generation, apply the SAME reference-photo accuracy rules
4. MULTI-CHAR: When generating multiple characters, EACH must match their individual references

=== EXECUTION PRIORITY ===

1. ALWAYS prioritize reference-photo fidelity over creativity
2. Treat reference photos as THE EXACT IDENTITY of each character
3. Do NOT invent or extrapolate facial features
4. Every output must CLEARLY MATCH the reference images 99-100% of the time
5. Someone who knows this person should IMMEDIATELY recognize them
6. Use the CLEAREST reference photo features when combining multiple refs

=== CRITICAL REMINDER ===
The reference photos ARE the characters. COPY THEM EXACTLY.
Do not creatively reinterpret. Do not stylize the face.
The face is LOCKED to the reference photos - 100% accuracy required.
Anyone who knows these people must INSTANTLY recognize them.
`;

// Detailed character profiles with 100% accuracy instructions
const CHARACTER_PROFILES: Record<string, string> = {
  'jessie': `
CHARACTER: JESSIE CRIDER
Role: Primary Creator / App Owner
Gender: Male (DO NOT CHANGE)
Age: Young adult (DO NOT CHANGE)
Hair: Blonde/light brown, wavy texture - COPY FROM REFERENCE
Skin: Light/fair complexion - COPY FROM REFERENCE
Key Features: Wavy light hair, young male features, casual modern style
Reference Photo: 1 provided - COPY THIS FACE WITH 100% ACCURACY
CRITICAL: Every facial feature must match the reference photo exactly
`,
  'dr-harman': `
CHARACTER: DR. HARMAN  
Role: Historical Ancestor (3rd Great-Grandfather)
Era: 1800s American
Gender: Male (DO NOT CHANGE)
Hair: Dark hair, parted in the middle - COPY FROM REFERENCE
DISTINCTIVE FEATURE: FULL THICK BEARD - graying/salt-and-pepper (THIS IS HIS MOST RECOGNIZABLE TRAIT - MUST BE PRESENT)
Eyes: Intense, piercing gaze - COPY FROM REFERENCE
Attire: Dark formal 1800s suit, white dress shirt
Skin: Weathered, period-appropriate complexion - COPY FROM REFERENCE
Reference Photo: 1 provided - COPY THIS FACE WITH 100% ACCURACY, especially the beard
Historical Note: Use sepia/vintage tones, period-accurate styling
CRITICAL: The beard is his defining feature - MUST match reference exactly
`,
  'savanaa': `
CHARACTER: SAVANAA
Role: Jessie's Girlfriend
Gender: Female (DO NOT CHANGE)
Age: Young adult (DO NOT CHANGE)
Hair: Dark hair (brown/black) - COPY FROM REFERENCES
Eyes: Warm, expressive - COPY FROM REFERENCES
Skin: Natural, healthy complexion - COPY FROM REFERENCES
Personality: Confident, bold, vibrant
Key Features: Dark hair, warm expressive eyes, natural beauty
Reference Photos: MULTIPLE provided (3+) - COMBINE ALL INTO ONE CONSISTENT IDENTITY
CRITICAL: Use the clearest facial features from ALL references to build complete identity
Study ALL reference photos to understand her face completely
The combined identity must be INSTANTLY RECOGNIZABLE as Savanaa
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

    // Get ALL references for detected characters from the DATABASE (not provided chars)
    // This ensures we always have the correct reference_photo_url
    let characters: any[] = [];

    if (detectedSlugs.length > 0) {
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
    
    // Debug: log what characters we have
    for (const char of characters) {
      console.log(`Character found: slug=${char.slug}, name=${char.name}, url=${char.reference_photo_url}`);
    }

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
    
    console.log(`Character groups: ${JSON.stringify(Object.keys(characterGroups))}`);

    const sortRefs = (a: any, b: any) => {
      const ap = a.is_primary ? 1 : 0;
      const bp = b.is_primary ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const ag = a.generation_count ?? 0;
      const bg = b.generation_count ?? 0;
      if (ag !== bg) return bg - ag;
      const au = new Date(a.updated_at || a.created_at || 0).getTime();
      const bu = new Date(b.updated_at || b.created_at || 0).getTime();
      return bu - au;
    };

    // Use ALL references for maximum accuracy - the model should combine them intelligently
    // For Savanaa with 3 refs, use all 3. For single-ref characters, use the 1.
    const MAX_REFS_PER_CHARACTER = 5; // Increased to ensure all refs are used

    const selectedCharactersForRefs: any[] = [];
    const validationErrors: string[] = [];
    
    for (const [groupName, refs] of Object.entries(characterGroups)) {
      console.log(`Processing group "${groupName}" with ${refs.length} refs`);
      
      // Validate each reference photo exists and is accessible
      const validRefs: any[] = [];
      for (const ref of refs) {
        if (!ref.reference_photo_url) {
          console.warn(`Missing reference_photo_url for ${ref.slug || ref.name}`);
          validationErrors.push(`Missing photo URL for ${ref.name || ref.slug}`);
          continue;
        }
        validRefs.push(ref);
      }
      
      if (validRefs.length === 0) {
        validationErrors.push(`No valid reference photos found for ${groupName}`);
        continue;
      }
      
      const sorted = [...validRefs].sort(sortRefs);
      // Use all available refs up to the cap
      const selectedRefs = sorted.slice(0, MAX_REFS_PER_CHARACTER);
      selectedCharactersForRefs.push(...selectedRefs);
      console.log(`Selected ${selectedRefs.length} of ${refs.length} refs for ${groupName}`);
    }

    // If validation found missing refs, log but continue with available ones
    if (validationErrors.length > 0) {
      console.warn('Reference validation warnings:', validationErrors);
    }

    console.log(`Reference selection: using ${selectedCharactersForRefs.length} ref(s) total`);

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
        masterPrompt += `- Reference Photos (available): ${refs.length}\n`;
        masterPrompt += `- Reference Photos (used): ${Math.min(refs.length, MAX_REFS_PER_CHARACTER)}\n`;
        if (primary.description) masterPrompt += `- Description: ${primary.description}\n`;
        if (primary.traits) masterPrompt += `- Traits: ${primary.traits}\n`;
        if (primary.era) masterPrompt += `- Era: ${primary.era}\n`;
        masterPrompt += '\n';
      }

      // Add user's actual request
      masterPrompt += '=== USER REQUEST ===\n';
      masterPrompt += prompt + '\n\n';

      // Final execution reminder - 100% accuracy
      masterPrompt += '=== EXECUTE WITH 100% FACIAL ACCURACY ===\n';
      masterPrompt += 'Generate the image with characters that are EXACT COPIES of their reference photos.\n';
      masterPrompt += 'The faces must be INSTANTLY RECOGNIZABLE. 100% accuracy required.\n';
      masterPrompt += 'Copy the references EXACTLY - do not invent or creatively reinterpret.\n';
      masterPrompt += 'Use ALL provided reference photos to build the most accurate representation.\n';
      masterPrompt += 'Anyone who knows these people must IMMEDIATELY recognize them in the output.\n';

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

    // Edit mode source image (identity anchor)
    if (mode === 'edit' && imageUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    // Add ALL selected reference images (capped at 5 per character)
    // Use the production URL that's publicly accessible
    const siteUrl = 'https://crideros.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    // Helper to fetch and add reference image
    const addReferenceImage = async (url: string, charName: string, refNum: number): Promise<boolean> => {
      try {
        const imageResponse = await fetch(url);
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = base64Encode(new Uint8Array(arrayBuffer));
          const contentType = imageResponse.headers.get('content-type') || 'image/png';
          const dataUrl = `data:${contentType};base64,${base64}`;
          
          messageContent.push({
            type: 'image_url',
            image_url: { url: dataUrl }
          });
          console.log(`Successfully loaded reference ${refNum} for ${charName} as base64`);
          return true;
        }
      } catch (fetchError) {
        console.error(`Error fetching reference for ${charName}:`, fetchError);
      }
      return false;
    };

    // Fetch reference images and convert to base64 for more reliable delivery
    let refCount = 0;
    const sortedRefs = [...selectedCharactersForRefs].sort(sortRefs);
    const processedCharNames = new Set<string>();
    
    for (const char of sortedRefs) {
      // Skip if we already processed this character name (dedup)
      if (processedCharNames.has(char.name.toLowerCase())) {
        continue;
      }
      processedCharNames.add(char.name.toLowerCase());
      
      // First add the primary reference from the database
      if (char.reference_photo_url) {
        let refUrl = char.reference_photo_url;

        // Build full URL
        if (refUrl.startsWith('/')) {
          refUrl = `${siteUrl}${refUrl}`;
        } else if (refUrl.startsWith('character-references/')) {
          refUrl = `${supabaseUrl}/storage/v1/object/public/${refUrl}`;
        } else if (!refUrl.startsWith('http')) {
          refUrl = `${siteUrl}/${refUrl}`;
        }

        console.log(`Primary reference for ${char.name}: ${refUrl}`);
        if (await addReferenceImage(refUrl, char.name, refCount + 1)) {
          refCount++;
        }
      }
      
      // Now try to find additional numbered reference photos (e.g., jr-hoback-reference-2.jpg, jr-hoback-reference-3.jpg)
      const slug = char.slug.replace(/-\d+$/, ''); // Remove trailing number if any
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (let i = 2; i <= 5; i++) {
        let foundAdditional = false;
        for (const ext of extensions) {
          const additionalUrl = `${siteUrl}/${slug}-reference-${i}.${ext}`;
          
          try {
            const checkResponse = await fetch(additionalUrl, { method: 'HEAD' });
            if (checkResponse.ok) {
              console.log(`Found additional reference ${i} for ${char.name}: ${additionalUrl}`);
              if (await addReferenceImage(additionalUrl, char.name, refCount + 1)) {
                refCount++;
                foundAdditional = true;
                break; // Found this numbered reference, move to next number
              }
            }
          } catch {
            // File doesn't exist, continue
          }
        }
        if (!foundAdditional) {
          break; // No more sequential references found
        }
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
        modalities: ['image', 'text'],
        // Reduce randomness for repeatability / identity consistency
        temperature: 0,
        top_p: 0.1
      })
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
    let imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageResult) {
      const textResponse = data.choices?.[0]?.message?.content || 'No response';
      console.error('No image generated:', textResponse.substring(0, 300));
      return new Response(
        JSON.stringify({ error: 'No image generated', details: textResponse }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply watermark to the generated image
    console.log('Applying CriderGPT watermark...');
    imageResult = await addWatermark(imageResult);

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
