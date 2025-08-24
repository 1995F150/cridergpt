
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

  const generateSmartResponse = useCallback(async (
    input: string,
    selectedModel: string = 'gpt-4o-mini',
    category?: string
  ): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setIsLoading(true);
    try {
      // First, search for past relevant interactions
      const pastInteractions = await searchPastInteractions(input);
      
      let response: string;
      
      if (pastInteractions.length > 0) {
        // If we have relevant past interactions, use them to enhance the response
        const relevantContext = pastInteractions
          .map(interaction => `Previous Q: ${interaction.user_input}\nPrevious A: ${interaction.ai_response}`)
          .join('\n\n');
        
        const enhancedPrompt = `Based on our previous conversations:
${relevantContext}

Current question: ${input}

Please provide a response that builds upon our previous interactions and maintains consistency with past answers while addressing the current question.`;

        response = await getOpenAIResponse(enhancedPrompt, selectedModel);
        
        // Add context about using past knowledge
        response = `${response}\n\n*[Response enhanced using past conversation knowledge]*`;
      } else {
        // No past interactions found, use OpenAI directly
        response = await getOpenAIResponse(input, selectedModel);
      }

      // Store this new interaction for future learning
      const contextTags = [
        category || 'general',
        'crider-gpt',
        pastInteractions.length > 0 ? 'enhanced-with-memory' : 'new-knowledge'
      ];
      
      await storeInteraction(input, response, category, undefined, contextTags);
      
      return response;
    } catch (error) {
      console.error('Error generating smart response:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, searchPastInteractions, storeInteraction]);

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
