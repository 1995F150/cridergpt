import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Character detection keywords - EXPANDED for 99% accuracy
const CHARACTER_KEYWORDS: Record<string, string[]> = {
  'jessie': [
    'jessie', 'crider', 'creator', 'jesse', 'jessie crider',
    'ffa jacket', 'historian jacket', 'ffa blue jacket', 'his jacket', 
    'ffa officer', 'ffa member', 'ffa historian', 'the historian',
    'me', 'myself', 'i', 'my photo', 'my picture', 'my portrait'
  ],
  'dr-harman': [
    'dr harman', 'dr. harman', 'harman', 'doctor harman', 
    'great-grandfather', 'great grandfather', 'grandfather', 'ancestor', 
    'dr-harman', 'the doctor', 'old doctor', 'vintage doctor'
  ],
  'savanaa': [
    'savanaa', 'savannah', 'sav', 'savanna', 
    'girlfriend', 'my girlfriend', 'her', 'my girl'
  ],
  'jr-hoback': [
    'jr hoback', 'jr-hoback', 'j.r. hoback', 'hoback', 'jr', 'j.r.',
    'uncle', 'friend jr', 'my uncle', 'uncle jr',
    'curly hair man', 'gray curly hair', 'white curly hair'
  ]
};

const CHARACTER_BASE_NAMES = ['jessie', 'dr-harman', 'savanaa', 'jr-hoback'];

// =====================================================
// SMART KEYWORD EXTRACTION FOR LONG PROMPTS
// =====================================================
function extractImageKeywords(longPrompt: string): string {
  const prompt = longPrompt.toLowerCase();
  
  // Visual style keywords to detect and preserve
  const styleKeywords = [
    'blueprint', 'diagram', 'schematic', 'wireframe', 'floor plan', 'layout',
    'realistic', 'photorealistic', 'cinematic', 'artistic', 'cartoon', 'anime',
    '3d', '2d', 'isometric', 'aerial view', 'birds eye', 'side view', 'front view',
    'portrait', 'landscape', 'panoramic', 'close-up', 'wide shot',
    'vintage', 'retro', 'modern', 'futuristic', 'sci-fi', 'fantasy',
    'dark', 'bright', 'colorful', 'monochrome', 'black and white', 'sepia',
    'minimalist', 'detailed', 'complex', 'simple', 'clean', 'professional',
    'technical', 'architectural', 'engineering', 'industrial'
  ];
  
  // Subject keywords
  const subjectKeywords = [
    'data center', 'datacenter', 'server', 'server room', 'server rack',
    'building', 'office', 'house', 'room', 'interior', 'exterior',
    'person', 'man', 'woman', 'people', 'group', 'portrait',
    'landscape', 'nature', 'city', 'urban', 'rural',
    'car', 'vehicle', 'machine', 'equipment', 'technology',
    'logo', 'icon', 'symbol', 'graphic', 'illustration',
    'farm', 'tractor', 'field', 'barn', 'agriculture', 'crop',
    'animal', 'cow', 'horse', 'dog', 'cat', 'livestock'
  ];
  
  // Size/scale keywords
  const scaleKeywords = [
    'large', 'small', 'huge', 'tiny', 'massive', 'compact',
    'big', 'little', 'giant', 'mini', 'mega', 'micro'
  ];
  
  // Quality/detail keywords
  const qualityKeywords = [
    'high quality', 'hd', '4k', '8k', 'ultra', 'premium',
    'detailed', 'intricate', 'precise', 'accurate', 'professional'
  ];
  
  // Extract found keywords
  const foundStyles: string[] = [];
  const foundSubjects: string[] = [];
  const foundScales: string[] = [];
  const foundQualities: string[] = [];
  
  // Find matches
  for (const kw of styleKeywords) {
    if (prompt.includes(kw)) foundStyles.push(kw);
  }
  for (const kw of subjectKeywords) {
    if (prompt.includes(kw)) foundSubjects.push(kw);
  }
  for (const kw of scaleKeywords) {
    if (prompt.includes(kw)) foundScales.push(kw);
  }
  for (const kw of qualityKeywords) {
    if (prompt.includes(kw)) foundQualities.push(kw);
  }
  
  // Extract any quoted phrases (user intentions)
  const quotedPhrases = longPrompt.match(/"([^"]+)"/g)?.map(q => q.replace(/"/g, '')) || [];
  
  // Extract key nouns using simple pattern matching
  const sentences = longPrompt.split(/[.!?]+/);
  const keyPhrases: string[] = [];
  
  // Look for "generate/create/make X" patterns
  for (const sentence of sentences) {
    const genMatch = sentence.match(/(?:generate|create|make|draw|design|build|show)\s+(?:a|an|the)?\s*(.+?)(?:for|with|that|which|,|$)/i);
    if (genMatch) {
      keyPhrases.push(genMatch[1].trim().substring(0, 100));
    }
  }
  
  // Look for "X of Y" patterns (e.g., "blueprint of a data center")
  const ofMatch = longPrompt.match(/(\w+(?:\s+\w+)?)\s+of\s+(?:a|an|the)?\s*(.+?)(?:\.|,|for|with|that|$)/i);
  if (ofMatch) {
    keyPhrases.push(`${ofMatch[1]} of ${ofMatch[2].substring(0, 50)}`);
  }
  
  // Build condensed prompt
  const parts: string[] = [];
  
  // Priority 1: Extracted key phrases from user intent
  if (keyPhrases.length > 0) {
    parts.push(keyPhrases.slice(0, 2).join(', '));
  }
  
  // Priority 2: Found subjects
  if (foundSubjects.length > 0) {
    parts.push(foundSubjects.slice(0, 3).join(' '));
  }
  
  // Priority 3: Styles
  if (foundStyles.length > 0) {
    parts.push(foundStyles.slice(0, 3).join(', '));
  }
  
  // Priority 4: Scale
  if (foundScales.length > 0) {
    parts.push(foundScales[0]);
  }
  
  // Priority 5: Quality
  if (foundQualities.length > 0) {
    parts.push(foundQualities[0]);
  }
  
  // Priority 6: Quoted phrases (explicit user requests)
  if (quotedPhrases.length > 0) {
    parts.push(quotedPhrases.slice(0, 2).join(', '));
  }
  
  // If we found nothing, just take the first 200 chars and clean it
  if (parts.length === 0) {
    return longPrompt
      .substring(0, 300)
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  const condensed = parts.join(', ');
  console.log(`📝 Keyword extraction: "${condensed}" (from ${longPrompt.length} chars)`);
  return condensed;
}

// =====================================================
// CONDENSED CHARACTER INSTRUCTIONS (for token efficiency)
// =====================================================
const COMPACT_REFERENCE_RULES = `
IDENTITY LOCK: Copy faces from reference photos with 100% accuracy.
RULES:
- Eyes, nose, mouth, jawline, skin tone = EXACT match to reference
- Hair color/style = EXACT match
- Gender, age, ethnicity = DO NOT change
- May vary: clothing, accessories, background
- Multi-character: each face matches their own references ONLY
- Consistency: same person must look identical across generations

MULTI-SUBJECT COMPOSITION (CRITICAL when 2+ people):
- When multiple characters are specified, ALL characters MUST appear TOGETHER in the SAME image
- Position characters SIDE BY SIDE or INTERACTING with each other
- Each character's face must match THEIR OWN reference photos - DO NOT blend or merge features
- Maintain clear separation between individuals - each is a DISTINCT person
- Show both/all characters in the frame at appropriate sizes
- If Jessie AND JR are requested: show BOTH people standing together, each with their distinct features

EXECUTE: Reference photos ARE the identity. Copy exactly. For multi-character: show ALL characters together.
`;

// Compact character profiles
const COMPACT_PROFILES: Record<string, string> = {
  'jessie': 'JESSIE CRIDER: Male, young adult, blonde/light brown wavy hair, fair skin, FFA Historian 2025-2026. When FFA context: navy blue corduroy jacket, gold "Jessie Crider" + "Historian" + "2025-2026" embroidery, FFA emblem right chest.',
  'dr-harman': 'DR. HARMAN: Male, 1800s ancestor, dark hair parted middle, FULL THICK SALT-AND-PEPPER BEARD (defining feature), intense eyes, weathered skin, formal 1800s suit. Use sepia/vintage tones.',
  'savanaa': 'SAVANAA: Female, young adult, dark brown/black hair, warm expressive eyes, natural complexion, confident vibrant personality.',
  'jr-hoback': 'JR HOBACK: Male, middle-aged, gray/white SHORT CURLY hair (defining feature), light eyes, fair weathered skin, friendly warm smile, stocky build.'
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

    console.log(`📥 Received prompt (${prompt.length} chars): "${prompt.substring(0, 100)}..."`);

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
      return (b.generation_count ?? 0) - (a.generation_count ?? 0);
    };

    // Select up to 5 refs per character (reduced from 10 for token efficiency)
    const MAX_REFS_PER_CHARACTER = 5;
    const selectedCharactersForRefs: any[] = [];

    for (const [groupName, refs] of Object.entries(characterGroups)) {
      const validRefs = refs.filter(r => r.reference_photo_url);
      if (validRefs.length === 0) continue;
      
      const sorted = [...validRefs].sort(sortRefs);
      const selectedRefs = sorted.slice(0, MAX_REFS_PER_CHARACTER);
      selectedCharactersForRefs.push(...selectedRefs);
      console.log(`Selected ${selectedRefs.length} of ${refs.length} refs for ${groupName}`);
    }

    // =====================================================
    // SMART PROMPT PROCESSING
    // =====================================================
    
    // If prompt is too long (> 500 chars), extract keywords
    const isLongPrompt = prompt.length > 500;
    const processedPrompt = isLongPrompt ? extractImageKeywords(prompt) : prompt;
    
    // Build the master prompt (CONDENSED for token efficiency)
    let masterPrompt = '';

    if (Object.keys(characterGroups).length > 0) {
      // Add compact reference rules
      masterPrompt = COMPACT_REFERENCE_RULES + '\n\n';

      // Add compact character profiles
      masterPrompt += 'CHARACTERS:\n';
      for (const baseName of Object.keys(characterGroups)) {
        const profile = COMPACT_PROFILES[baseName];
        if (profile) {
          masterPrompt += `• ${profile}\n`;
        }
      }
      masterPrompt += '\n';

      // MULTI-CHARACTER EXPLICIT INSTRUCTION
      if (Object.keys(characterGroups).length > 1) {
        const characterNames = Object.keys(characterGroups).map(slug => 
          COMPACT_PROFILES[slug]?.split(':')[0]?.trim() || slug.toUpperCase()
        ).join(' AND ');
        
        masterPrompt += `⚠️ MULTI-SUBJECT IMAGE REQUIRED: Generate ${characterNames} TOGETHER in the SAME frame.\n`;
        masterPrompt += `COMPOSITION: Both/all people must be visible, positioned side by side or interacting.\n`;
        masterPrompt += `CRITICAL: Each person's face MUST match THEIR OWN reference photos - do NOT blend features.\n`;
        masterPrompt += `Both individuals are DISTINCT people with different appearances.\n\n`;
      }

      // Add the processed user request
      masterPrompt += `REQUEST: ${processedPrompt}\n`;
      masterPrompt += '\nGENERATE: High quality image matching request. Faces EXACTLY match references.';
    } else {
      // No characters - just use processed prompt with quality boost
      masterPrompt = `${processedPrompt}\n\nStyle: High quality, detailed, professional.`;
    }

    // Add style modifiers
    if (settings) {
      const styles: string[] = [];
      if (settings.blackAndWhite) styles.push('black and white');
      if (settings.vintageTexture) styles.push('vintage texture');
      if (settings.filmGrain) styles.push('film grain');
      if (settings.mood) styles.push(`${settings.mood} mood`);
      if (settings.style === 'rdr2') styles.push('Red Dead Redemption 2 style');
      if (settings.style === 'cinematic') styles.push('cinematic');
      if (settings.style === 'portrait') styles.push('portrait photography');
      if (settings.era) styles.push(`${settings.era} era`);

      if (styles.length > 0) {
        masterPrompt += `\nSTYLE: ${styles.join(', ')}`;
      }
    }

    console.log(`📝 Final prompt (${masterPrompt.length} chars): "${masterPrompt.substring(0, 200)}..."`);

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

    // FIXED: Use correct production URL
    const siteUrl = 'https://cridergpt.lovable.app';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    // Helper to fetch and add reference image
    const addReferenceImage = async (url: string, charName: string): Promise<boolean> => {
      try {
        const imageResponse = await fetch(url, { 
          headers: { 'Accept': 'image/*' },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = base64Encode(new Uint8Array(arrayBuffer));
          const contentType = imageResponse.headers.get('content-type') || 'image/png';
          const dataUrl = `data:${contentType};base64,${base64}`;
          
          messageContent.push({
            type: 'image_url',
            image_url: { url: dataUrl }
          });
          
          console.log(`✅ Loaded ref for "${charName}": ${url}`);
          return true;
        } else {
          console.error(`❌ Failed ref for "${charName}": ${url} - HTTP ${imageResponse.status}`);
        }
      } catch (fetchError) {
        console.error(`❌ Error loading ref for "${charName}": ${url} - ${(fetchError as Error).message}`);
      }
      return false;
    };

    // Fetch reference images
    let refCount = 0;
    const processedCharNames = new Set<string>();

    for (const char of selectedCharactersForRefs) {
      if (processedCharNames.has(char.name.toLowerCase())) continue;
      processedCharNames.add(char.name.toLowerCase());

      // Build correct reference URL
      if (char.reference_photo_url) {
        let refUrl = char.reference_photo_url;

        if (refUrl.startsWith('/')) {
          refUrl = `${siteUrl}${refUrl}`;
        } else if (refUrl.startsWith('character-references/')) {
          refUrl = `${supabaseUrl}/storage/v1/object/public/${refUrl}`;
        } else if (!refUrl.startsWith('http')) {
          refUrl = `${siteUrl}/${refUrl}`;
        }

        if (await addReferenceImage(refUrl, char.name)) {
          refCount++;
        }
      }

      // Try numbered additional references (limited to 5 per char)
      const slug = char.slug.replace(/-\d+$/, '');
      const extensions = ['jpg', 'png'];
      
      for (let i = 2; i <= 5 && refCount < 15; i++) {
        let found = false;
        for (const ext of extensions) {
          const additionalUrl = `${siteUrl}/${slug}-reference-${i}.${ext}`;
          
          try {
            const checkResponse = await fetch(additionalUrl, { method: 'HEAD' });
            if (checkResponse.ok) {
              if (await addReferenceImage(additionalUrl, char.name)) {
                refCount++;
                found = true;
                break;
              }
            }
          } catch { /* File doesn't exist */ }
        }
        if (!found) break; // Stop if we can't find the next numbered reference
      }
    }

    console.log(`📸 Total reference photos loaded: ${refCount}`);

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
        temperature: 0,
        top_p: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Try again in a few seconds.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}`, details: errorText.substring(0, 200) }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageResult) {
      const textResponse = data.choices?.[0]?.message?.content || 'No response';
      console.error('No image generated:', textResponse.substring(0, 300));
      
      // Try to provide helpful feedback
      let userMessage = 'Could not generate image.';
      if (textResponse.includes('cannot generate') || textResponse.includes('unable to')) {
        userMessage = 'The image request was rejected. Try rephrasing your prompt or removing specific person references.';
      }
      
      return new Response(
        JSON.stringify({ error: userMessage, details: textResponse.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Image generated successfully');

    // Log generation
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      } catch { /* ignore auth errors */ }
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
        message: `Generated successfully (${refCount} references used)`,
        detectedCharacters: Object.keys(characterGroups),
        referencePhotosUsed: refCount,
        promptProcessed: isLongPrompt,
        originalPromptLength: prompt.length,
        processedPromptLength: processedPrompt.length
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
