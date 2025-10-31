import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AIMemory {
  id: string;
  category: string;
  topic: string;
  details: string;
  source: string;
  metadata: any; // Changed from Record<string, any> to handle Supabase Json type
  created_at: string;
}

interface MemoryStats {
  totalMemories: number;
  categoriesCount: number;
  recentTopics: string[];
}

export function useAIMemory() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Categorize input based on keywords and context
   */
  const categorizeInput = useCallback((input: string, context?: string): string => {
    const lowerInput = input.toLowerCase();
    const lowerContext = context?.toLowerCase() || '';
    
    // Agriculture & Farming
    if (lowerInput.match(/farm|crop|livestock|cattle|cow|pig|chicken|harvest|soil|field|tractor|feed|hay/)) {
      return 'agriculture';
    }
    
    // FFA Leadership
    if (lowerInput.match(/ffa|leadership|cde|sae|agriscience|parliamentary|speaking|convention/)) {
      return 'ffa_leadership';
    }
    
    // FS22/FS25 Modding
    if (lowerInput.match(/farming simulator|fs22|fs25|mod|modding|map|xml|i3d|giant editor/)) {
      return 'fs_modding';
    }
    
    // Mechanics & Technical
    if (lowerInput.match(/weld|engine|repair|mechanical|voltage|electrical|maintenance|tools/)) {
      return 'mechanics';
    }
    
    // Receipt Analysis
    if (lowerInput.match(/receipt|invoice|purchase|payment|transaction|cost/) || lowerContext.match(/receipt|invoice/)) {
      return 'receipt_analysis';
    }
    
    // Document Analysis
    if (lowerInput.match(/document|pdf|analyze|analysis|file/) || lowerContext.match(/document/)) {
      return 'document_analysis';
    }
    
    // Vision/Image Analysis
    if (lowerContext.match(/image|photo|picture|meme|visual/)) {
      return 'vision_analysis';
    }
    
    return 'general';
  }, []);

  /**
   * Store a memory entry
   */
  const storeMemory = useCallback(async (
    userInput: string,
    aiResponse: string,
    source: 'conversation' | 'image' | 'document',
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    try {
      const category = categorizeInput(userInput, metadata.imageUrl ? 'image' : metadata.documentUrl ? 'document' : '');
      const topic = userInput.substring(0, 100); // First 100 chars as topic
      
      const { error } = await supabase
        .from('ai_memory')
        .insert({
          user_id: user.id,
          category,
          topic,
          details: aiResponse,
          source,
          metadata: {
            ...metadata,
            userInput,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error storing memory:', error);
      }
    } catch (error) {
      console.error('Memory storage error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, categorizeInput]);

  /**
   * Retrieve memories by category
   */
  const getMemoriesByCategory = useCallback(async (
    category: string,
    limit: number = 10
  ): Promise<AIMemory[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Fetch error:', error);
      return [];
    }
  }, [user]);

  /**
   * Search memories by topic or details
   */
  const searchMemories = useCallback(async (
    query: string,
    limit: number = 10
  ): Promise<AIMemory[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('*')
        .or(`topic.ilike.%${query}%,details.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, [user]);

  /**
   * Get recent memories
   */
  const getRecentMemories = useCallback(async (limit: number = 20): Promise<AIMemory[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Fetch error:', error);
      return [];
    }
  }, [user]);

  /**
   * Get memory statistics
   */
  const getMemoryStats = useCallback(async (): Promise<MemoryStats> => {
    if (!user) return { totalMemories: 0, categoriesCount: 0, recentTopics: [] };

    try {
      // Get total count
      const { count } = await supabase
        .from('ai_memory')
        .select('*', { count: 'exact', head: true });

      // Get unique categories
      const { data: categoryData } = await supabase
        .from('ai_memory')
        .select('category')
        .order('created_at', { ascending: false });

      // Get recent topics
      const { data: topicData } = await supabase
        .from('ai_memory')
        .select('topic')
        .order('created_at', { ascending: false })
        .limit(10);

      const categories = [...new Set(categoryData?.map(d => d.category).filter(Boolean) || [])];
      const topics = topicData?.map(d => d.topic).filter(Boolean) || [];

      return {
        totalMemories: count || 0,
        categoriesCount: categories.length,
        recentTopics: topics
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return { totalMemories: 0, categoriesCount: 0, recentTopics: [] };
    }
  }, [user]);

  /**
   * Delete a memory
   */
  const deleteMemory = useCallback(async (memoryId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('ai_memory')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting memory:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, [user]);

  return {
    storeMemory,
    getMemoriesByCategory,
    searchMemories,
    getRecentMemories,
    getMemoryStats,
    deleteMemory,
    isLoading
  };
}
