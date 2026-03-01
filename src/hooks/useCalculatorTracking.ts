import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UseCalculatorTrackingOptions {
  calculatorType: string;
  projectId?: string;
}

export function useCalculatorTracking({ calculatorType, projectId }: UseCalculatorTrackingOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const checkUsageLimit = async (): Promise<{ canProceed: boolean; reason: string }> => {
    if (!user) return { canProceed: false, reason: 'User not authenticated' };
    
    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('can_use_calculator', {
        user_uuid: user.id
      });

      if (error) throw error;
      return data as { canProceed: boolean; reason: string };
    } catch (error) {
      console.error('Error checking calculator usage:', error);
      return { canProceed: false, reason: 'Error checking usage limits' };
    } finally {
      setIsChecking(false);
    }
  };

  const recordUsage = async (inputData: any, resultData: any) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('record_calculator_usage', {
        user_uuid: user.id,
        calc_type: calculatorType,
        input_data: inputData,
        result_data: resultData,
        project_id: projectId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording calculator usage:', error);
      return null;
    }
  };

  const executeCalculation = async (inputData: any, calculateFn: () => any) => {
    // Check usage limit first
    const limitCheck = await checkUsageLimit();
    
    if (!limitCheck.canProceed) {
      toast({
        title: "Usage Limit Reached",
        description: limitCheck.reason,
        variant: "destructive"
      });
      return null;
    }

    // Perform calculation
    const result = calculateFn();

    // Record usage
    await recordUsage(inputData, result);

    return result;
  };

  const recordFeedback = async (originalData: any, correctedData: any, calculatorRecordId?: string, notes?: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('feedback')
        .insert({
          user_id: user.id,
          feedback_type: 'correction',
          original_data: originalData,
          corrected_data: correctedData,
          calculator_record_id: calculatorRecordId,
          notes
        });

      if (error) throw error;

      toast({
        title: "Feedback Recorded",
        description: "Thank you for helping improve our calculations!",
      });
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  };

  return {
    checkUsageLimit,
    recordUsage,
    executeCalculation,
    recordFeedback,
    isChecking
  };
}