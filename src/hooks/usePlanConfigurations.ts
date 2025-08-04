
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
        setError(null);
        
        const { data, error: fetchError } = await supabase.rpc('get_all_active_plans');
        
        if (fetchError) {
          console.error('Supabase error:', fetchError);
          throw fetchError;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn('No plan data received or data is not an array');
          setPlans([]);
          return;
        }
        
        // Transform and validate the data
        const transformedPlans: PlanConfiguration[] = data.map(plan => {
          // Ensure features is an array of strings
          let features: string[] = [];
          if (Array.isArray(plan.features)) {
            features = plan.features.filter(f => typeof f === 'string');
          }
          
          // Ensure limits has proper structure
          const limits = {
            tokens: Number(plan.limits?.tokens) || 0,
            tts: Number(plan.limits?.tts) || 0,
            projects: Number(plan.limits?.projects) || 0,
            api_keys: Number(plan.limits?.api_keys) || 0,
            file_upload_mb: Number(plan.limits?.file_upload_mb) || 0,
          };
          
          return {
            plan_name: String(plan.plan_name || ''),
            plan_display_name: String(plan.plan_display_name || ''),
            price_monthly: Number(plan.price_monthly) || 0,
            features,
            limits,
            sort_order: Number(plan.sort_order) || 0,
          };
        });
        
        // Sort plans by sort_order
        transformedPlans.sort((a, b) => a.sort_order - b.sort_order);
        
        setPlans(transformedPlans);
      } catch (err) {
        console.error('Error fetching plan configurations:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plans';
        setError(errorMessage);
        
        // Set fallback plans if database fetch fails
        setPlans([
          {
            plan_name: 'free',
            plan_display_name: 'Free',
            price_monthly: 0,
            features: ['13 tokens/month', '5 TTS requests/month', 'Basic support'],
            limits: { tokens: 13, tts: 5, projects: 1, api_keys: 1, file_upload_mb: 10 },
            sort_order: 1
          },
          {
            plan_name: 'plus',
            plan_display_name: 'Plus',
            price_monthly: 9,
            features: ['200 tokens/month', '100 TTS requests/month', 'Priority support', 'File upload'],
            limits: { tokens: 200, tts: 100, projects: 5, api_keys: 3, file_upload_mb: 50 },
            sort_order: 2
          },
          {
            plan_name: 'pro',
            plan_display_name: 'Pro',
            price_monthly: 19,
            features: ['500 tokens/month', 'Unlimited TTS', 'Priority support', 'Advanced features'],
            limits: { tokens: 500, tts: 999999, projects: 10, api_keys: 5, file_upload_mb: 100 },
            sort_order: 3
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
