import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface UnifiedMemory {
  id: string;
  category: string;
  topic: string;
  details: string;
  source: string;
  metadata: Json | null;
  created_at: string;
}

export interface MemoryStats {
  totalMemories: number;
  categoriesCount: number;
  recentTopics: string[];
}

const categorizeInput = (input: string, context?: string): string => {
  const text = `${input} ${context || ''}`.toLowerCase();
  
  if (text.includes('farm') || text.includes('crop') || text.includes('harvest') || text.includes('livestock')) {
    return 'farming';
  }
  if (text.includes('weld') || text.includes('metal') || text.includes('torch')) {
    return 'welding';
  }
  if (text.includes('truck') || text.includes('vehicle') || text.includes('engine') || text.includes('car')) {
    return 'vehicles';
  }
  if (text.includes('ffa') || text.includes('agriculture education')) {
    return 'ffa';
  }
  if (text.includes('code') || text.includes('program') || text.includes('function') || text.includes('typescript')) {
    return 'coding';
  }
  return 'general';
};

export function useUnifiedMemory() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isMemoryEnabled = async (): Promise<boolean> => {
    if (!user?.id) return true;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('memory_enabled')
        .eq('user_id', user.id)
        .single();
      
      return data?.memory_enabled ?? true;
    } catch {
      return true;
    }
  };

  const setMemoryEnabled = async (enabled: boolean): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ memory_enabled: enabled })
        .eq('user_id', user.id);
      
      return !error;
    } catch {
      return false;
    }
  };

  const storeMemory = async (
    userInput: string,
    aiResponse: string,
    source: 'conversation' | 'image' | 'document' = 'conversation',
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!user?.id) return;

    const enabled = await isMemoryEnabled();
    if (!enabled) return;

    setIsLoading(true);
    try {
      const category = categorizeInput(userInput, aiResponse);
      const topic = userInput.substring(0, 100);

      await supabase.from('ai_memory').insert({
        user_id: user.id,
        category,
        topic,
        details: aiResponse.substring(0, 500),
        source,
        metadata: metadata || null,
      });
    } catch (error) {
      console.error('Error storing memory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMemory = async (query: string, limit = 10): Promise<UnifiedMemory[]> => {
    if (!user?.id) return [];

    const enabled = await isMemoryEnabled();
    if (!enabled) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('*')
        .eq('user_id', user.id)
        .or(`topic.ilike.%${query}%,details.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching memory:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getRecentMemory = async (limit = 20): Promise<UnifiedMemory[]> => {
    if (!user?.id) return [];

    const enabled = await isMemoryEnabled();
    if (!enabled) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent memory:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getMemoryStats = async (): Promise<MemoryStats> => {
    if (!user?.id) return { totalMemories: 0, categoriesCount: 0, recentTopics: [] };

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('category, topic')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const categories = new Set(data?.map(m => m.category) || []);
      const topics = data?.slice(0, 5).map(m => m.topic) || [];

      return {
        totalMemories: data?.length || 0,
        categoriesCount: categories.size,
        recentTopics: topics,
      };
    } catch (error) {
      console.error('Error fetching memory stats:', error);
      return { totalMemories: 0, categoriesCount: 0, recentTopics: [] };
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllMemory = async (): Promise<boolean> => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ai_memory')
        .delete()
        .eq('user_id', user.id);

      return !error;
    } catch (error) {
      console.error('Error clearing memory:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    storeMemory,
    searchMemory,
    getRecentMemory,
    getMemoryStats,
    clearAllMemory,
    isMemoryEnabled,
    setMemoryEnabled,
    isLoading,
  };
}
