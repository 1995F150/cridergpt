import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VisionMemoryEntry {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  ai_response: string;
  category: string;
  tags: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

// Smart categorization based on keywords
function categorizeImage(text: string, response: string): { category: string; tags: string[] } {
  const combined = `${text} ${response}`.toLowerCase();
  const tags: string[] = [];
  let category = 'general';

  // FFA and Agriculture
  if (combined.match(/ffa|sae|project|livestock|crop|field|harvest|plant/i)) {
    category = 'FFA Project';
    tags.push('agriculture', 'ffa');
  }
  
  // Receipts and Documents
  else if (combined.match(/receipt|invoice|bill|payment|purchase|total|price|\$|subtotal/i)) {
    category = 'Receipt';
    tags.push('finance', 'document');
  }
  
  // Documents
  else if (combined.match(/document|paper|form|contract|agreement|letter/i)) {
    category = 'Document';
    tags.push('document');
  }
  
  // Farm Equipment
  else if (combined.match(/tractor|plow|combine|equipment|machinery|tool|welding|vehicle/i)) {
    category = 'Farm Equipment';
    tags.push('equipment', 'machinery');
  }
  
  // Field Photos
  else if (combined.match(/field|farm|barn|pasture|fence|land|outdoor/i)) {
    category = 'Field Photo';
    tags.push('outdoor', 'farm');
  }
  
  // Memes
  else if (combined.match(/meme|funny|humor|joke|caption/i)) {
    category = 'Meme';
    tags.push('entertainment');
  }

  return { category, tags };
}

export function useVisionMemory() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const saveVisionMemory = useCallback(async (
    imageUrl: string,
    aiResponse: string,
    userInput?: string
  ): Promise<void> => {
    if (!user) return;

    try {
      const { category, tags } = categorizeImage(userInput || '', aiResponse);

      const { error } = await supabase
        .from('vision_memory')
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          thumbnail_url: imageUrl, // Could be optimized later
          ai_response: aiResponse,
          category,
          tags,
          metadata: { user_input: userInput || '' }
        });

      if (error) {
        console.error('Error saving vision memory:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save vision memory:', error);
      throw error;
    }
  }, [user]);

  const getRecentMemories = useCallback(async (limit = 10): Promise<VisionMemoryEntry[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vision_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching vision memory:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getMemoriesByCategory = useCallback(async (category: string): Promise<VisionMemoryEntry[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vision_memory')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching memories by category:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getMemoriesByDateRange = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<VisionMemoryEntry[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vision_memory')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching memories by date:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteMemory = useCallback(async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vision_memory')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting vision memory:', error);
      throw error;
    }
  }, [user]);

  return {
    saveVisionMemory,
    getRecentMemories,
    getMemoriesByCategory,
    getMemoriesByDateRange,
    deleteMemory,
    isLoading
  };
}
