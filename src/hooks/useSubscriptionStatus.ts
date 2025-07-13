import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    plan: string;
    isActive: boolean;
    loading: boolean;
  }>({
    plan: 'free',
    isActive: false,
    loading: true
  });

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionStatus({ plan: 'free', isActive: false, loading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ai_usage')
          .select('user_plan')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription status:', error);
          setSubscriptionStatus({ plan: 'free', isActive: false, loading: false });
          return;
        }

        const plan = data?.user_plan || 'free';
        const isActive = plan !== 'free';

        setSubscriptionStatus({
          plan,
          isActive,
          loading: false
        });
      } catch (error) {
        console.error('Subscription check error:', error);
        setSubscriptionStatus({ plan: 'free', isActive: false, loading: false });
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  return subscriptionStatus;
};

// Helper functions for feature checking
export const hasFeature = (userPlan: string, feature: string): boolean => {
  const planFeatures = {
    free: ['basic_chat', 'basic_tts', 'system_updates'],
    plus: ['basic_chat', 'basic_tts', 'system_updates', 'backend_generator', 'project_management', 'email_support'],
    pro: ['basic_chat', 'basic_tts', 'system_updates', 'backend_generator', 'project_management', 'email_support', 'unlimited_projects', 'premium_upload', 'analytics', 'mod_deployment', 'priority_support', 'automation']
  };

  return planFeatures[userPlan as keyof typeof planFeatures]?.includes(feature) || false;
};

export const isPlanActive = (userPlan: string): boolean => {
  return userPlan !== 'free';
};