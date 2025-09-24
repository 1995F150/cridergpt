import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LifetimePlanConfig {
  lifetime_plan_count: number;
  max_lifetime_buyers: number;
  promotion_end_date: string | null;
  is_active: boolean;
}

export function useLifetimePlan() {
  const [config, setConfig] = useState<LifetimePlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lifetime_plan_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setConfig(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching lifetime plan config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLifetimeAvailable = () => {
    if (!config) return false;
    if (!config.is_active) return false;
    if (config.lifetime_plan_count >= config.max_lifetime_buyers) return false;
    
    if (config.promotion_end_date) {
      const endDate = new Date(config.promotion_end_date);
      const now = new Date();
      if (now > endDate) return false;
    }
    
    return true;
  };

  const getSlotsRemaining = () => {
    if (!config) return 0;
    return Math.max(0, config.max_lifetime_buyers - config.lifetime_plan_count);
  };

  const getPromotionMessage = () => {
    if (!config) return '';
    
    const slotsRemaining = getSlotsRemaining();
    
    if (config.promotion_end_date) {
      const endDate = new Date(config.promotion_end_date);
      const formattedDate = endDate.toLocaleDateString();
      return `⚡ Lifetime Plan ends ${formattedDate} or after ${slotsRemaining} more buyers — whichever comes first.`;
    }
    
    return `⚡ Only ${slotsRemaining} Lifetime Founder spots remaining!`;
  };

  const getSoldOutMessage = () => {
    return "❌ Lifetime Founder Plan is sold out. Thanks to the 35 early supporters! Please choose Free, Plus, or Pro.";
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    isLifetimeAvailable,
    getSlotsRemaining,
    getPromotionMessage,
    getSoldOutMessage,
    refetch: fetchConfig
  };
}