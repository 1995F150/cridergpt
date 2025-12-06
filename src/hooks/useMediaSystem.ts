import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export interface MediaCharacter {
  id: string;
  slug: string;
  name: string;
  referenceUrl: string;
  pronouns: string;
  era?: string;
  description?: string;
  traits?: string;
  context?: string;
  isPrimary?: boolean;
  isSystem?: boolean;
  generationCount?: number;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  path: string;
  type: 'image' | 'video';
  source: string;
  characters?: string[];
  style?: string;
  era?: string;
  mood?: string;
  tags?: string[];
  createdAt: string;
  size: number;
}

export interface GenerationSettings {
  characters: string[];
  scene?: string;
  era?: string;
  style: 'realistic' | 'cinematic' | 'vintage' | 'rdr2' | 'cartoon' | 'anime';
  mood?: string;
  composition?: string;
  lighting?: string;
  blackAndWhite?: boolean;
  vintageTexture?: boolean;
  filmGrain?: boolean;
  outputType?: 'image' | 'video';
}

// Fallback characters if database isn't available
const FALLBACK_CHARACTERS: MediaCharacter[] = [
  {
    id: 'jessie-fallback',
    slug: 'jessie',
    name: 'Jessie Crider',
    referenceUrl: '/creator-reference.png',
    pronouns: 'he/him',
    description: 'Primary character - creator of CriderGPT',
    traits: 'Rural high school student, FFA member, tech enthusiast, farmer',
    context: 'Creator and primary subject for all generations.',
    isPrimary: true,
    isSystem: true
  },
  {
    id: 'dr-harman-fallback',
    slug: 'dr-harman',
    name: 'Dr. Harman',
    referenceUrl: '/dr-harman-reference.png',
    pronouns: 'he/him',
    era: '1900s Western',
    description: '3rd great-grandfather - historical Western era',
    traits: 'Historical figure, Western era, bearded, period-appropriate clothing',
    context: 'Reference photo is from early 1900s. Apply vintage texture, film grain, B&W unless color explicitly requested.',
    isPrimary: false,
    isSystem: true
  }
];

export function useMediaSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<MediaCharacter[]>(FALLBACK_CHARACTERS);

  // Fetch characters from database
  const fetchCharacters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('character_references')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error fetching characters:', error);
        return;
      }

      if (data && data.length > 0) {
        const mappedCharacters: MediaCharacter[] = data.map(char => ({
          id: char.id,
          slug: char.slug,
          name: char.name,
          referenceUrl: char.reference_photo_url,
          pronouns: char.pronouns || 'they/them',
          era: char.era || undefined,
          description: char.description || undefined,
          traits: char.traits || undefined,
          context: char.context || undefined,
          isPrimary: char.is_primary || false,
          isSystem: char.is_system || false,
          generationCount: char.generation_count || 0
        }));
        setCharacters(mappedCharacters);
      }
    } catch (err) {
      console.error('Error in fetchCharacters:', err);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // Parse prompt for character mentions
  const parseCharacters = useCallback((prompt: string): string[] => {
    const detected: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const char of characters) {
      const nameParts = char.name.toLowerCase().split(' ');
      if (nameParts.some(part => lowerPrompt.includes(part)) || 
          lowerPrompt.includes(char.slug)) {
        detected.push(char.slug);
      }
    }

    // Check for keywords
    if (lowerPrompt.includes('me') || lowerPrompt.includes('creator')) {
      if (!detected.includes('jessie')) detected.push('jessie');
    }
    if (lowerPrompt.includes('grandfather') || lowerPrompt.includes('ancestor')) {
      if (!detected.includes('dr-harman')) detected.push('dr-harman');
    }
    
    // Default to primary character if none mentioned
    if (detected.length === 0) {
      const primary = characters.find(c => c.isPrimary);
      if (primary) detected.push(primary.slug);
    }
    
    return detected;
  }, [characters]);

  // Parse style hints from prompt
  const parseStyleHints = useCallback((prompt: string): Partial<GenerationSettings> => {
    const hints: Partial<GenerationSettings> = {};
    const lowerPrompt = prompt.toLowerCase();
    
    // Era/style detection
    if (lowerPrompt.includes('western') || lowerPrompt.includes('1900') || 
        lowerPrompt.includes('old west') || lowerPrompt.includes('rdr2')) {
      hints.era = 'Western 1900s';
      hints.style = 'rdr2';
      hints.vintageTexture = true;
      hints.filmGrain = true;
    }
    if (lowerPrompt.includes('black and white') || lowerPrompt.includes('b&w')) {
      hints.blackAndWhite = true;
    }
    if (lowerPrompt.includes('vintage') || lowerPrompt.includes('film grain') || 
        lowerPrompt.includes('old photo') || lowerPrompt.includes('antique')) {
      hints.vintageTexture = true;
      hints.filmGrain = true;
    }
    if (lowerPrompt.includes('cinematic')) {
      hints.style = 'cinematic';
    }
    if (lowerPrompt.includes('cartoon') || lowerPrompt.includes('animated')) {
      hints.style = 'cartoon';
    }
    if (lowerPrompt.includes('anime')) {
      hints.style = 'anime';
    }
    
    // Mood detection
    if (lowerPrompt.includes('dramatic')) hints.mood = 'dramatic';
    if (lowerPrompt.includes('warm') || lowerPrompt.includes('cozy')) hints.mood = 'warm';
    if (lowerPrompt.includes('dark') || lowerPrompt.includes('moody')) hints.mood = 'moody';
    
    return hints;
  }, []);

  // Build unified prompt with character context
  const buildPrompt = useCallback((
    basePrompt: string,
    settings: GenerationSettings,
    detectedChars: MediaCharacter[]
  ): string => {
    const parts: string[] = [];
    
    // Character descriptions with traits and context
    if (detectedChars.length > 0) {
      const charDescriptions = detectedChars.map(c => {
        let desc = `${c.name}`;
        if (c.traits) desc += ` (${c.traits})`;
        if (c.era) desc += ` from ${c.era} era`;
        return desc;
      }).join(' and ');
      parts.push(`Portrait of ${charDescriptions}`);
      
      // Add character context instructions
      const contextInstructions = detectedChars
        .filter(c => c.context)
        .map(c => c.context)
        .join('. ');
      if (contextInstructions) {
        parts.push(contextInstructions);
      }
    }
    
    // Scene/prompt
    parts.push(basePrompt);
    
    // Style modifiers
    if (settings.style === 'rdr2' || settings.era?.includes('Western')) {
      parts.push('Red Dead Redemption 2 style portrait, old West aesthetic, historically accurate');
    }
    if (settings.blackAndWhite) {
      parts.push('black and white photograph, no color');
    }
    if (settings.vintageTexture) {
      parts.push('vintage film texture, slight vignette, faded tones, authentic period photograph');
    }
    if (settings.filmGrain) {
      parts.push('film grain overlay, authentic old photograph look');
    }
    if (settings.mood) {
      parts.push(`${settings.mood} mood and atmosphere`);
    }
    if (settings.lighting) {
      parts.push(`${settings.lighting} lighting`);
    }
    if (settings.composition) {
      parts.push(`${settings.composition} composition`);
    }
    
    // Safety: maintain historical accuracy
    const hasHistorical = detectedChars.some(c => c.era?.includes('1900') || c.era?.includes('Western'));
    if (hasHistorical) {
      parts.push('Maintain exact facial features, beard, hair from reference. No artistic liberties, no modernizing, no smoothing.');
    }
    
    return parts.join('. ');
  }, []);

  // Get image as base64
  const getImageAsBase64 = useCallback(async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Save media to library
  const saveToLibrary = useCallback(async (
    base64Data: string,
    source: string,
    metadata: Partial<MediaItem>
  ): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
      
      const fileName = `${source}_${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, blob, { contentType: 'image/png', cacheControl: '3600' });

      if (uploadError) throw uploadError;

      await supabase.from('uploaded_files').insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        file_size: blob.size,
        file_type: 'image',
        source: source,
        metadata: {
          characters: metadata.characters,
          style: metadata.style,
          era: metadata.era,
          mood: metadata.mood,
          tags: metadata.tags
        }
      });

      return filePath;
    } catch (error) {
      console.error('Error saving to library:', error);
      return null;
    }
  }, [user]);

  // Log generation to database
  const logGeneration = useCallback(async (
    prompt: string,
    unifiedPrompt: string,
    characterIds: string[],
    settings: GenerationSettings,
    outputPath?: string
  ) => {
    if (!user) return;
    
    try {
      await supabase.from('media_generations').insert({
        user_id: user.id,
        prompt,
        unified_prompt: unifiedPrompt,
        output_type: settings.outputType || 'image',
        output_path: outputPath,
        style: settings.style,
        visual_settings: {
          blackAndWhite: settings.blackAndWhite,
          vintageTexture: settings.vintageTexture,
          filmGrain: settings.filmGrain,
          mood: settings.mood,
          lighting: settings.lighting
        },
        status: outputPath ? 'completed' : 'pending'
      });
    } catch (err) {
      console.error('Error logging generation:', err);
    }
  }, [user]);

  // Increment character generation count
  const incrementCharacterCount = useCallback(async (slugs: string[]) => {
    for (const slug of slugs) {
      const char = characters.find(c => c.slug === slug);
      if (char && !char.isSystem) {
        await supabase
          .from('character_references')
          .update({ generation_count: (char.generationCount || 0) + 1 })
          .eq('slug', slug);
      }
    }
  }, [characters]);

  // Generate image with character references
  const generateWithCharacters = useCallback(async (
    prompt: string,
    settings: GenerationSettings
  ) => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return null;
    }

    setIsLoading(true);
    try {
      // Get character slugs
      const charSlugs = settings.characters.length > 0 ? settings.characters : parseCharacters(prompt);
      const detectedChars = characters.filter(c => charSlugs.includes(c.slug));
      
      // Auto-detect style hints from prompt
      const styleHints = parseStyleHints(prompt);
      const mergedSettings = { ...settings, ...styleHints };
      
      // Apply era-specific defaults for historical characters
      const hasHistorical = detectedChars.some(c => c.era?.includes('1900') || c.era?.includes('Western'));
      if (hasHistorical && !mergedSettings.blackAndWhite && !prompt.toLowerCase().includes('color')) {
        mergedSettings.blackAndWhite = true;
        mergedSettings.vintageTexture = true;
        mergedSettings.filmGrain = true;
      }
      
      // Build unified prompt
      const unifiedPrompt = buildPrompt(prompt, mergedSettings, detectedChars);
      
      // Get reference images
      const referenceImages: string[] = [];
      for (const char of detectedChars) {
        try {
          const base64 = await getImageAsBase64(char.referenceUrl);
          referenceImages.push(base64);
        } catch (e) {
          console.warn(`Could not load reference for ${char.name}`);
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: unifiedPrompt,
          mode: referenceImages.length > 0 ? 'character' : 'generate',
          imageUrl: referenceImages[0],
          additionalImages: referenceImages.slice(1),
          characters: charSlugs,
          settings: mergedSettings
        }
      });

      if (error) throw error;

      if (data?.imageData) {
        const savedPath = await saveToLibrary(data.imageData, 'character_gen', {
          characters: charSlugs,
          style: mergedSettings.style,
          era: mergedSettings.era,
          mood: mergedSettings.mood
        });
        
        await logGeneration(prompt, unifiedPrompt, charSlugs, mergedSettings, savedPath || undefined);
        await incrementCharacterCount(charSlugs);
        
        toast({ title: "Success", description: "Image generated and saved!" });
        return data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, characters, parseCharacters, parseStyleHints, buildPrompt, getImageAsBase64, saveToLibrary, logGeneration, incrementCharacterCount, toast]);

  // Add new character from upload
  const addCharacter = useCallback(async (
    name: string,
    imageFile: File,
    pronouns: string = 'they/them',
    era?: string,
    description?: string,
    traits?: string,
    context?: string
  ) => {
    if (!user) return null;
    
    try {
      const fileName = `character_${Date.now()}.png`;
      const filePath = `${user.id}/characters/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, imageFile, { contentType: imageFile.type });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);
      
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data: newCharData, error: insertError } = await supabase
        .from('character_references')
        .insert({
          user_id: user.id,
          name,
          slug: `${slug}_${Date.now()}`,
          pronouns,
          era,
          description,
          traits,
          context,
          reference_photo_url: urlData.publicUrl,
          reference_photo_path: filePath,
          is_primary: false,
          is_system: false
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      const newChar: MediaCharacter = {
        id: newCharData.id,
        slug: newCharData.slug,
        name: newCharData.name,
        referenceUrl: newCharData.reference_photo_url,
        pronouns: newCharData.pronouns,
        era: newCharData.era,
        description: newCharData.description,
        traits: newCharData.traits,
        context: newCharData.context,
        isPrimary: false,
        isSystem: false,
        generationCount: 0
      };
      
      setCharacters(prev => [...prev, newChar]);
      toast({ title: "Character Added", description: `${name} is now available for generations` });
      
      return newChar;
    } catch (error: any) {
      console.error('Error adding character:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, toast]);

  // Update character text placeholders
  const updateCharacter = useCallback(async (
    id: string,
    updates: { traits?: string; context?: string; description?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('character_references')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setCharacters(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));
      
      toast({ title: "Updated", description: "Character info saved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  return {
    characters,
    isLoading,
    fetchCharacters,
    parseCharacters,
    parseStyleHints,
    buildPrompt,
    generateWithCharacters,
    saveToLibrary,
    addCharacter,
    updateCharacter,
    getImageAsBase64,
    logGeneration
  };
}
