import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface PlanLimits {
  tokens: number;
  tts: number;
  projects: number;
  api_keys: number;
  file_upload_mb: number;
  ai_images: number;
  document_analysis: number;
}

interface UserUsage {
  tokens_used: number;
  tts_requests: number;
  ai_images_used: number;
  documents_analyzed: number;
}

export function useFeatureGating() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchUserPlanAndUsage();
  }, [user]);

  const fetchUserPlanAndUsage = async () => {
    if (!user) return;

    try {
      console.log(`🔍 Fetching plan data for user: ${user.id}`);
      
      // Get user's current plan from user_subscriptions table (primary source)
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('plan_name, plan_status, subscription_end_date, stripe_subscription_id')
        .eq('user_id', user.id)
        .single();

      let plan = 'free';
      if (subscriptionData && !subscriptionError) {
        plan = subscriptionData.plan_name;
        console.log(`📋 Found subscription: plan=${plan}, status=${subscriptionData.plan_status}`);
      } else {
        // Fallback to ai_usage table for backward compatibility
        const { data: usageData } = await supabase
          .from('ai_usage')
          .select('user_plan')
          .eq('user_id', user.id)
          .single();
        
        plan = usageData?.user_plan || 'free';
        console.log(`📋 Fallback to ai_usage: plan=${plan}`);
      }

      console.log(`📊 Current user plan: ${plan} for user ${user.id}`);
      setCurrentPlan(plan);

      // Get plan limits from configuration
      const { data: planConfig } = await supabase
        .from('plan_configurations')
        .select('limits')
        .eq('plan_name', plan)
        .single();

      if (planConfig?.limits) {
        setPlanLimits(planConfig.limits as any);
        console.log(`⚙️ Loaded plan limits for ${plan}:`, planConfig.limits);
      }

      // Get usage data from ai_usage table
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('tokens_used')
        .eq('user_id', user.id)
        .single();

      // Get TTS usage for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: ttsData } = await supabase
        .from('tts_requests')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single();

      setUserUsage({
        tokens_used: usageData?.tokens_used || 0,
        tts_requests: ttsData?.count || 0,
        ai_images_used: 0, // TODO: Track this
        documents_analyzed: 0 // TODO: Track this
      });

    } catch (error) {
      console.error('❌ Error fetching plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time plan updates via notifications
  useEffect(() => {
    if (!user) return;

    console.log(`👂 Setting up real-time subscription listener for user ${user.id}`);

    const subscription = supabase
      .channel('plan_updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'feature_notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('📢 Received plan update notification:', payload);
          if (payload.new.notification_type === 'subscription_updated') {
            console.log('🔄 Refreshing plan data due to subscription update');
            // Refresh the plan data immediately
            fetchUserPlanAndUsage();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Unsubscribing from plan updates');
      subscription.unsubscribe();
    };
  }, [user]);

  // Feature access checks
  const hasFeatureAccess = (feature: string): boolean => {
    switch (feature) {
      case 'ai_chat':
        return true; // All plans have AI chat
      case 'ai_voice_chat':
        return currentPlan === 'pro';
      case 'ai_image_generator':
        return currentPlan !== 'free';
      case 'document_analyzer':
        return currentPlan !== 'free';
      case 'invoicing_system':
        return currentPlan === 'pro';
      case 'agricultural_calculators':
        return true; // All plans
      case 'business_intelligence':
        return currentPlan === 'pro';
      case 'quickbooks_integration':
        return currentPlan === 'pro';
      case 'ffa_dashboard':
        return true; // All plans
      case 'cb_radio_tuner':
        return true; // All plans
      case 'crider_chat':
        console.log('🆓 Crider Chat: FREE access granted');
        return true; // Make Crider Chat free for all users
      default:
        return false;
    }
  };

  // Usage limit checks
  const canUseFeature = (feature: string): boolean => {
    if (!hasFeatureAccess(feature) || !planLimits || !userUsage) {
      return hasFeatureAccess(feature);
    }

    switch (feature) {
      case 'ai_chat':
        return planLimits.tokens === -1 || userUsage.tokens_used < planLimits.tokens;
      case 'tts':
        return planLimits.tts === -1 || userUsage.tts_requests < planLimits.tts;
      case 'ai_image_generator':
        return planLimits.ai_images === -1 || userUsage.ai_images_used < planLimits.ai_images;
      case 'document_analyzer':
        return planLimits.document_analysis === -1 || userUsage.documents_analyzed < planLimits.document_analysis;
      default:
        return hasFeatureAccess(feature);
    }
  };

  const getFeatureLimitInfo = (feature: string) => {
    if (!planLimits || !userUsage) return null;

    switch (feature) {
      case 'ai_chat':
        return {
          used: userUsage.tokens_used,
          limit: planLimits.tokens,
          unlimited: planLimits.tokens === -1
        };
      case 'tts':
        return {
          used: userUsage.tts_requests,
          limit: planLimits.tts,
          unlimited: planLimits.tts === -1
        };
      case 'ai_image_generator':
        return {
          used: userUsage.ai_images_used,
          limit: planLimits.ai_images,
          unlimited: planLimits.ai_images === -1
        };
      case 'document_analyzer':
        return {
          used: userUsage.documents_analyzed,
          limit: planLimits.document_analysis,
          unlimited: planLimits.document_analysis === -1
        };
      default:
        return null;
    }
  };

  const isPlan = (plan: string): boolean => {
    return currentPlan === plan || (plan === 'plu' && currentPlan === 'plus');
  };

  const getPlanDisplayName = (): string => {
    switch (currentPlan) {
      case 'plus':
      case 'plu':
        return 'CriderGPT Plus';
      case 'pro':
        return 'CriderGPT Pro';
      default:
        return 'CriderGPT Free';
    }
  };

  return {
    currentPlan,
    planLimits,
    userUsage,
    loading,
    hasFeatureAccess,
    canUseFeature,
    getFeatureLimitInfo,
    isPlan,
    getPlanDisplayName,
    refreshData: fetchUserPlanAndUsage
  };
}