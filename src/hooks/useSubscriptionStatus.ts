import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    plan: string;
    isActive: boolean;
    source?: string;
    expiresAt?: string | null;
    loading: boolean;
  }>({
    plan: 'free',
    isActive: false,
    loading: true,
  });

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setSubscriptionStatus({ plan: 'free', isActive: false, loading: false });
        return;
      }

      try {
        // Unified cross-platform entitlement (Stripe web + Google Play + Apple IAP + lifetime)
        const { data, error } = await supabase.functions.invoke('get-entitlement');

        if (!error && data && typeof data.plan === 'string') {
          setSubscriptionStatus({
            plan: data.plan,
            isActive: !!data.isActive,
            source: data.source,
            expiresAt: data.expiresAt,
            loading: false,
          });
          return;
        }

        // Fallback to legacy direct table read
        const [usageResult, profileResult] = await Promise.all([
          supabase.from('ai_usage').select('user_plan').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('tier').eq('user_id', user.id).maybeSingle(),
        ]);

        const plan = profileResult.data?.tier || usageResult.data?.user_plan || 'free';
        setSubscriptionStatus({
          plan,
          isActive: plan !== 'free',
          source: 'fallback',
          loading: false,
        });
      } catch (err) {
        console.error('Subscription check error:', err);
        setSubscriptionStatus({ plan: 'free', isActive: false, loading: false });
      }
    };

    check();
  }, [user]);

  return subscriptionStatus;
};

// Helper functions for feature checking
export const hasFeature = (userPlan: string, feature: string): boolean => {
  const planFeatures = {
    free: ['basic_chat', 'basic_tts', 'system_updates'],
    plus: ['basic_chat', 'basic_tts', 'system_updates', 'backend_generator', 'project_management', 'email_support'],
    pro: ['basic_chat', 'basic_tts', 'system_updates', 'backend_generator', 'project_management', 'email_support', 'unlimited_projects', 'premium_upload', 'analytics', 'mod_deployment', 'priority_support', 'automation'],
    lifetime: ['basic_chat', 'basic_tts', 'system_updates', 'backend_generator', 'project_management', 'email_support', 'unlimited_projects', 'premium_upload', 'analytics', 'mod_deployment', 'priority_support', 'automation', 'unlimited_tokens', 'unlimited_tts', 'harvest_helper', 'tech_tillage', 'innovator'],
  };
  return planFeatures[userPlan as keyof typeof planFeatures]?.includes(feature) || false;
};

export const isPlanActive = (userPlan: string): boolean => userPlan !== 'free';
