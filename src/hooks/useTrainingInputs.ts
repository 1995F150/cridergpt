import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrainingInput {
  id: string;
  content: string;
  category: string | null;
  metadata: any;
  created_at: string;
}

export function useTrainingInputs(category?: string) {
  const { user } = useAuth();
  const [trainingInputs, setTrainingInputs] = useState<TrainingInput[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrainingInputs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_training_inputs', {
        user_uuid: user.id,
        input_category: category,
        limit_count: 10
      });

      if (error) throw error;
      setTrainingInputs(data || []);
    } catch (error) {
      console.error('Error fetching training inputs:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrainingInput = async (content: string, inputCategory?: string, metadata?: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('training_inputs')
        .insert({
          user_id: user.id,
          content,
          category: inputCategory,
          metadata: metadata || {}
        });

      if (error) throw error;
      await fetchTrainingInputs(); // Refresh the list
    } catch (error) {
      console.error('Error adding training input:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrainingInputs();
    }
  }, [user, category]);

  return {
    trainingInputs,
    loading,
    fetchTrainingInputs,
    addTrainingInput
  };
}