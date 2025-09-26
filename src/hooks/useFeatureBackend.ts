import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackendRoutineResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function useFeatureBackend() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const executeBackendRoutine = async (
    action: 'sync_relationship_tech' | 'scan_api_leaks' | 'savannah_reply',
    data?: any
  ): Promise<BackendRoutineResult> => {
    setLoading(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('feature-backend-routine', {
        body: { action, data }
      });

      if (error) {
        console.error('Backend routine error:', error);
        toast({
          title: "Error",
          description: error.message || 'Backend routine failed',
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error executing backend routine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const syncRelationshipTech = () => executeBackendRoutine('sync_relationship_tech');
  
  const scanApiLeaks = () => executeBackendRoutine('scan_api_leaks');
  
  const generateSavannahReply = (message: string, userId: string) => 
    executeBackendRoutine('savannah_reply', { message, user_id: userId });

  return {
    loading,
    syncRelationshipTech,
    scanApiLeaks,
    generateSavannahReply,
    executeBackendRoutine,
  };
}