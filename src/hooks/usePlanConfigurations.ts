
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanConfiguration {
  plan_name: string;
  plan_display_name: string;
  price_monthly: number;
  features: string[];
  limits: {
    messages: number;
    tts: number;
    projects: number;
    api_keys: number;
    file_upload_mb: number;
  };
  sort_order: number;
}

// Static fallback plans for safe mode
const STATIC_PLANS: PlanConfiguration[] = [
  {
    plan_name: 'free',
    plan_display_name: 'CriderGPT Free',
    price_monthly: 0,
    features: ['15 messages/day', '5 TTS requests/day', 'GPT-3.5 Turbo model', 'Basic support', '1 project', 'System updates'],
    limits: { messages: 15, tts: 5, projects: 1, api_keys: 1, file_upload_mb: 10 },
    sort_order: 1
  },
  {
    plan_name: 'plus',
    plan_display_name: 'CriderGPT Plus',
    price_monthly: 3,
    features: ['100 messages/day', '100 TTS requests/day', 'GPT-4o Mini model', 'Priority support', 'File upload (50MB)', '5 projects', 'Backend code generator'],
    limits: { messages: 100, tts: 100, projects: 5, api_keys: 3, file_upload_mb: 50 },
    sort_order: 2
  },
  {
    plan_name: 'pro',
    plan_display_name: 'CriderGPT Pro',
    price_monthly: 7,
    features: ['500 messages/day', 'Unlimited TTS', 'GPT-4o model', 'Priority support', 'Advanced analytics', 'File upload (100MB)', '10 projects', 'Mod deployment', 'Automation tools'],
    limits: { messages: 500, tts: 999999, projects: 10, api_keys: 5, file_upload_mb: 100 },
    sort_order: 3
  },
  {
    plan_name: 'lifetime',
    plan_display_name: 'CriderGPT Lifetime',
    price_monthly: 30,
    features: ['Unlimited messages forever', 'Unlimited TTS forever', 'GPT-4o model', 'All current & future features', 'Unlimited projects', 'Founder badge', 'No monthly fees ever'],
    limits: { messages: 9999999, tts: 9999999, projects: 999, api_keys: 99, file_upload_mb: 500 },
    sort_order: 4
  }
];

export function usePlanConfigurations() {
  const [plans, setPlans] = useState<PlanConfiguration[]>(STATIC_PLANS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase.rpc('get_all_active_plans');
        
        if (fetchError || !data || !Array.isArray(data)) {
          // Use static plans as fallback
          console.log('Using static plans fallback');
          setPlans(STATIC_PLANS);
          return;
        }
        
        // Transform and validate the data with proper typing
        const transformedPlans: PlanConfiguration[] = data.map(plan => {
          let features: string[] = [];
          if (Array.isArray(plan.features)) {
            features = plan.features.filter(f => typeof f === 'string');
          }
          
          // Safely access limits object with proper type checking
          const planLimits = plan.limits as any;
          const limits = {
            messages: planLimits && typeof planLimits === 'object' ? Number(planLimits.messages || planLimits.tokens) || 0 : 0,
            tts: planLimits && typeof planLimits === 'object' ? Number(planLimits.tts) || 0 : 0,
            projects: planLimits && typeof planLimits === 'object' ? Number(planLimits.projects) || 0 : 0,
            api_keys: planLimits && typeof planLimits === 'object' ? Number(planLimits.api_keys) || 0 : 0,
            file_upload_mb: planLimits && typeof planLimits === 'object' ? Number(planLimits.file_upload_mb) || 0 : 0,
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
        
        transformedPlans.sort((a, b) => a.sort_order - b.sort_order);
        setPlans(transformedPlans);
      } catch (err) {
        console.error('Error fetching plan configurations, using static fallback:', err);
        setPlans(STATIC_PLANS);
        setError(null); // Don't show error in safe mode
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
