
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanConfiguration {
  plan_name: string;
  plan_display_name: string;
  price_monthly: number;
  features: string[];
  limits: {
    tokens: number;
    tts: number;
    projects: number;
    api_keys: number;
    file_upload_mb: number;
  };
  sort_order: number;
}

export function usePlanConfigurations() {
  const [plans, setPlans] = useState<PlanConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_all_active_plans');
        
        if (error) throw error;
        
        setPlans(data || []);
      } catch (err) {
        console.error('Error fetching plan configurations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
