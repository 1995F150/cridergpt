import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export interface MediaCharacter {
  id: string;
  name: string;
  referenceUrl: string;
  pronouns: string;
  era?: string;
  description?: string;
  isPrimary?: boolean;
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
}

// Default characters
export const DEFAULT_CHARACTERS: MediaCharacter[] = [
  {
    id: 'jessie',
    name: 'Jessie Crider',
    referenceUrl: '/creator-reference.png',
    pronouns: 'he/him',
    description: 'Primary character - creator of CriderGPT',
    isPrimary: true
  },
  {
    id: 'dr-harman',
    name: 'Dr. Harman',
    referenceUrl: '/dr-harman-reference.png',
    pronouns: 'he/him',
    era: '1900s Western',
    description: '3rd great-grandfather - historical Western era'
  }
];

export function useMediaSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<MediaCharacter[]>(DEFAULT_CHARACTERS);

  // Parse prompt for character mentions
  const parseCharacters = useCallback((prompt: string): string[] => {
    const detected: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('jessie') || lowerPrompt.includes('me') || lowerPrompt.includes('creator')) {
      detected.push('jessie');
    }
    if (lowerPrompt.includes('harman') || lowerPrompt.includes('grandfather') || lowerPrompt.includes('ancestor')) {
      detected.push('dr-harman');
    }
    
    // Default to Jessie if no character mentioned
    if (detected.length === 0) {
      detected.push('jessie');
    }
    
    return detected;
  }, []);

  // Parse style hints from prompt
  const parseStyleHints = useCallback((prompt: string): Partial<GenerationSettings> => {
    const hints: Partial<GenerationSettings> = {};
    const lowerPrompt = prompt.toLowerCase();
    
    // Era/style detection
    if (lowerPrompt.includes('western') || lowerPrompt.includes('1900') || lowerPrompt.includes('old west') || lowerPrompt.includes('rdr2')) {
      hints.era = 'Western 1900s';
      hints.style = 'rdr2';
      hints.vintageTexture = true;
    }
    if (lowerPrompt.includes('black and white') || lowerPrompt.includes('b&w')) {
      hints.blackAndWhite = true;
    }
    if (lowerPrompt.includes('vintage') || lowerPrompt.includes('film grain') || lowerPrompt.includes('old photo')) {
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

  // Build unified prompt
  const buildPrompt = useCallback((
    basePrompt: string,
    settings: GenerationSettings,
    detectedChars: MediaCharacter[]
  ): string => {
    const parts: string[] = [];
    
    // Character descriptions
    if (detectedChars.length > 0) {
      const charDescriptions = detectedChars.map(c => {
        let desc = c.name;
        if (c.era) desc += ` (${c.era} era)`;
        return desc;
      }).join(' and ');
      parts.push(`Portrait of ${charDescriptions}`);
    }
    
    // Scene/prompt
    parts.push(basePrompt);
    
    // Style modifiers
    if (settings.style === 'rdr2' || settings.era?.includes('Western')) {
      parts.push('Red Dead Redemption 2 style portrait, old West aesthetic');
    }
    if (settings.blackAndWhite) {
      parts.push('black and white photograph');
    }
    if (settings.vintageTexture) {
      parts.push('vintage film texture, slight vignette, faded tones');
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
      // Get character references
      const charIds = settings.characters.length > 0 ? settings.characters : parseCharacters(prompt);
      const detectedChars = characters.filter(c => charIds.includes(c.id));
      
      // Auto-detect style hints from prompt
      const styleHints = parseStyleHints(prompt);
      const mergedSettings = { ...settings, ...styleHints };
      
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
          characters: charIds,
          settings: mergedSettings
        }
      });

      if (error) throw error;

      if (data?.imageData) {
        await saveToLibrary(data.imageData, 'character_gen', {
          characters: charIds,
          style: mergedSettings.style,
          era: mergedSettings.era,
          mood: mergedSettings.mood
        });
        
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
  }, [user, characters, parseCharacters, parseStyleHints, buildPrompt, getImageAsBase64, saveToLibrary, toast]);

  // Add new character from upload
  const addCharacter = useCallback(async (
    name: string,
    imageFile: File,
    pronouns: string = 'they/them',
    era?: string,
    description?: string
  ) => {
    if (!user) return null;
    
    try {
      const fileName = `character_${Date.now()}.png`;
      const filePath = `${user.id}/characters/${fileName}`;
      
      const { error } = await supabase.storage
        .from('user-files')
        .upload(filePath, imageFile, { contentType: imageFile.type });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);
      
      const newChar: MediaCharacter = {
        id: `custom_${Date.now()}`,
        name,
        referenceUrl: urlData.publicUrl,
        pronouns,
        era,
        description
      };
      
      setCharacters(prev => [...prev, newChar]);
      toast({ title: "Character Added", description: `${name} is now available for generations` });
      
      return newChar;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, toast]);

  return {
    characters,
    isLoading,
    parseCharacters,
    parseStyleHints,
    buildPrompt,
    generateWithCharacters,
    saveToLibrary,
    addCharacter,
    getImageAsBase64
  };
}
