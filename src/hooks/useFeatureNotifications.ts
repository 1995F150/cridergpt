import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FeatureNotification {
  id: string;
  user_id: string;
  notification_type: string;
  data: any;
  read: boolean;
  created_at: string;
}

interface FeatureStatus {
  plan: string;
  featuresUnlocked: string[];
  lastUpdate: string;
}

export function useFeatureNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus | null>(null);
  const [notifications, setNotifications] = useState<FeatureNotification[]>([]);

  const getUnlockedFeatures = (plan: string): string[] => {
    switch (plan) {
      case 'free':
        return ['basic_chat', 'limited_tts'];
      case 'plu':  // Legacy format
      case 'plus': // New format
        return ['basic_chat', 'unlimited_tts', 'premium_chat', 'file_upload'];
      case 'pro':
        return ['basic_chat', 'unlimited_tts', 'premium_chat', 'file_upload', 'advanced_ai', 'priority_support'];
      default:
        return ['basic_chat', 'limited_tts'];
    }
  };

  const handleFeatureUpdate = (notification: FeatureNotification) => {
    const { new_plan } = notification.data;
    const unlockedFeatures = getUnlockedFeatures(new_plan);
    
    setFeatureStatus({
      plan: new_plan,
      featuresUnlocked: unlockedFeatures,
      lastUpdate: notification.created_at
    });

    // Show toast notification
    const planName = (new_plan === 'plu' || new_plan === 'plus') ? 'Plus' : new_plan === 'pro' ? 'Pro' : 'Free';
    toast({
      title: "Subscription Updated!",
      description: `Your plan has been updated to ${planName}. New features are now available!`,
      duration: 5000,
    });

    // Mark notification as read
    markNotificationAsRead(notification.id);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('feature_notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const refreshFeatureStatus = async () => {
    if (!user) return;

    try {
      // Get current user plan from ai_usage table
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('user_plan')
        .eq('user_id', user.id)
        .single();

      if (usageData?.user_plan) {
        const unlockedFeatures = getUnlockedFeatures(usageData.user_plan);
        setFeatureStatus({
          plan: usageData.user_plan,
          featuresUnlocked: unlockedFeatures,
          lastUpdate: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error refreshing feature status:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setFeatureStatus(null);
      setNotifications([]);
      return;
    }

    // Initial load of feature status
    refreshFeatureStatus();

    // Set up real-time listener for feature notifications
    const channel = supabase
      .channel('feature-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feature_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Received feature notification:', payload);
          const notification = payload.new as FeatureNotification;
          
          setNotifications(prev => [notification, ...prev]);
          
          if (notification.notification_type === 'subscription_updated') {
            handleFeatureUpdate(notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasFeature = (feature: string): boolean => {
    return featureStatus?.featuresUnlocked.includes(feature) || false;
  };

  const isPlan = (plan: string): boolean => {
    return featureStatus?.plan === plan;
  };

  return {
    featureStatus,
    notifications,
    hasFeature,
    isPlan,
    refreshFeatureStatus,
    markNotificationAsRead
  };
}