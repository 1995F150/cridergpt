
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getOpenAIResponse } from '@/utils/openai';
import { useToast } from '@/hooks/use-toast';

interface AIInteraction {
  id: string;
  user_input: string;
  ai_response: string;
  context_tags: string[];
  topic?: string;
  category?: string;
  created_at: string;
}

export function useAILearning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const searchPastInteractions = useCallback(async (input: string, limit = 3): Promise<AIInteraction[]> => {
    if (!user) return [];

    try {
      // Search for similar interactions using full-text search
      const { data, error } = await supabase
        .from('ai_interactions')
        .select('*')
        .textSearch('user_input', input.split(' ').join(' | '))
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error searching past interactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, [user]);

  const storeInteraction = useCallback(async (
    userInput: string,
    aiResponse: string,
    category?: string,
    topic?: string,
    contextTags: string[] = []
  ): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          user_input: userInput,
          ai_response: aiResponse,
          context_tags: contextTags,
          topic,
          category
        });

      if (error) {
        console.error('Error storing interaction:', error);
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  }, [user]);

  const generateDemoResponse = async (input: string): Promise<string> => {
    try {
      // For demo users, use the demo chat edge function
      const sessionId = localStorage.getItem('cridergpt_demo_session') || 
        'demo_' + Math.random().toString(36).substr(2, 9);
      
      if (!localStorage.getItem('cridergpt_demo_session')) {
        localStorage.setItem('cridergpt_demo_session', sessionId);
      }

      const { data, error } = await supabase.functions.invoke('demo-chat', {
        body: { message: input, sessionId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message);

      return data.response;
    } catch (error) {
      console.error('Demo response error:', error);
      throw new Error(error.message || 'Failed to generate demo response');
    }
  };

  const generateSmartResponse = useCallback(async (
    input: string,
    selectedModel: string = 'gpt-4o-mini',
    category?: string,
    imageData?: string
  ): Promise<{ response: string; imageUrl?: string }> => {
    // Handle demo mode for non-authenticated users
    if (!user) {
      if (imageData) {
        throw new Error('Image analysis requires sign-in');
      }
      return { response: await generateDemoResponse(input) };
    }

    setIsLoading(true);
    try {
      // Use chat-with-ai function which now supports images
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: { 
          message: input || "Analyze this image",
          model: selectedModel,
          imageData: imageData
        }
      });

      if (error) throw error;

      // Check if we hit the rate limit
      if (data.error && data.usage) {
        throw new Error(`${data.error} (Used: ${data.usage.used}/${data.usage.limit})`);
      }

      const response = data.response;
      
      // Store this new interaction for future learning
      const contextTags = [
        category || 'general',
        'crider-gpt',
        imageData ? 'vision-analysis' : 'text-interaction'
      ];
      
      await storeInteraction(input || "Image analysis", response, category, undefined, contextTags);
      
      return { response, imageUrl: imageData };
    } catch (error) {
      console.error('Error generating smart response:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, storeInteraction]);

  const getKnowledgeStats = useCallback(async (): Promise<{
    totalInteractions: number;
    categoriesKnown: string[];
    recentTopics: string[];
  }> => {
    if (!user) return { totalInteractions: 0, categoriesKnown: [], recentTopics: [] };

    try {
      // Get total interactions count
      const { count } = await supabase
        .from('ai_interactions')
        .select('*', { count: 'exact', head: true });

      // Get unique categories
      const { data: categoryData } = await supabase
        .from('ai_interactions')
        .select('category')
        .not('category', 'is', null)
        .order('created_at', { ascending: false });

      // Get recent topics
      const { data: topicData } = await supabase
        .from('ai_interactions')
        .select('topic')
        .not('topic', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      const categoriesKnown = [...new Set(categoryData?.map(d => d.category).filter(Boolean) || [])];
      const recentTopics = [...new Set(topicData?.map(d => d.topic).filter(Boolean) || [])];

      return {
        totalInteractions: count || 0,
        categoriesKnown,
        recentTopics
      };
    } catch (error) {
      console.error('Error getting knowledge stats:', error);
      return { totalInteractions: 0, categoriesKnown: [], recentTopics: [] };
    }
  }, [user]);

  return {
    searchPastInteractions,
    storeInteraction,
    generateSmartResponse,
    getKnowledgeStats,
    isLoading
  };
}
