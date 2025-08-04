
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

// Type for the raw data from Supabase
interface RawPlanConfiguration {
  plan_name: string;
  plan_display_name: string;
  price_monthly: number;
  features: any; // This comes as Json from Supabase
  limits: any;   // This comes as Json from Supabase
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
        
        // Transform the raw data to match our interface
        const transformedPlans: PlanConfiguration[] = (data as RawPlanConfiguration[] || []).map(plan => ({
          plan_name: plan.plan_name,
          plan_display_name: plan.plan_display_name,
          price_monthly: plan.price_monthly,
          features: Array.isArray(plan.features) ? plan.features : [],
          limits: {
            tokens: plan.limits?.tokens || 0,
            tts: plan.limits?.tts || 0,
            projects: plan.limits?.projects || 0,
            api_keys: plan.limits?.api_keys || 0,
            file_upload_mb: plan.limits?.file_upload_mb || 0,
          },
          sort_order: plan.sort_order,
        }));
        
        setPlans(transformedPlans);
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
