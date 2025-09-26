import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Wheat, Wrench, Rocket } from 'lucide-react';

interface FeatureSettings {
  harvest_helper_enabled: boolean;
  tech_tillage_enabled: boolean;
  innovator_enabled: boolean;
  savannah_tone_enabled: boolean;
}

interface UsageData {
  feature_name: string;
  count: number;
}

const USAGE_LIMITS = {
  free: 0,
  plus: 50,
  pro: 200,
  lifetime: -1 // unlimited
};

export function FeatureToggles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<FeatureSettings>({
    harvest_helper_enabled: false,
    tech_tillage_enabled: false,
    innovator_enabled: false,
    savannah_tone_enabled: false,
  });
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [userPlan, setUserPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadUsage();
      loadUserPlan();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('feature_usage')
        .select('feature_name')
        .eq('user_id', user?.id)
        .gte('timestamp', today);

      if (error) {
        console.error('Error loading usage:', error);
        return;
      }

      const usageCounts: Record<string, number> = {};
      data.forEach((item: UsageData) => {
        usageCounts[item.feature_name] = (usageCounts[item.feature_name] || 0) + 1;
      });
      setUsage(usageCounts);
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const loadUserPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('user_plan')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading user plan:', error);
        return;
      }

      setUserPlan(data?.user_plan || 'free');
    } catch (error) {
      console.error('Error loading user plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const logFeatureUsage = async (featureName: string, status: string) => {
    try {
      await supabase
        .from('feature_usage')
        .insert({
          user_id: user?.id,
          feature_name: featureName,
          status: status,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging feature usage:', error);
    }
  };

  const updateSetting = async (field: keyof FeatureSettings, value: boolean) => {
    if (!user) return;

    // Check usage limits for enabling features
    if (value && field !== 'savannah_tone_enabled') {
      const currentUsage = usage[field.replace('_enabled', '')] || 0;
      const limit = USAGE_LIMITS[userPlan as keyof typeof USAGE_LIMITS];
      
      if (limit !== -1 && currentUsage >= limit) {
        toast({
          title: "Usage Limit Reached",
          description: `You've reached your daily limit of ${limit} uses for this feature.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('feature_settings')
        .upsert({
          user_id: user.id,
          [field]: value,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating setting:', error);
        toast({
          title: "Error",
          description: "Failed to update setting",
          variant: "destructive",
        });
        return;
      }

      setSettings(prev => ({ ...prev, [field]: value }));
      await logFeatureUsage(field, value ? 'enabled' : 'disabled');
      
      if (value) {
        setUsage(prev => ({
          ...prev,
          [field.replace('_enabled', '')]: (prev[field.replace('_enabled', '')] || 0) + 1
        }));
      }

      toast({
        title: value ? "Feature Enabled" : "Feature Disabled",
        description: `${field.replace('_enabled', '').replace('_', ' ')} has been ${value ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  const getUsageDisplay = (featureName: string) => {
    const currentUsage = usage[featureName] || 0;
    const limit = USAGE_LIMITS[userPlan as keyof typeof USAGE_LIMITS];
    
    if (limit === -1) return "Unlimited";
    if (limit === 0) return "Not available";
    return `${currentUsage}/${limit}`;
  };

  const isFeatureBlocked = (featureName: string) => {
    if (userPlan === 'lifetime') return false;
    const currentUsage = usage[featureName] || 0;
    const limit = USAGE_LIMITS[userPlan as keyof typeof USAGE_LIMITS];
    return limit !== -1 && currentUsage >= limit;
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading feature settings...</div>;
  }

  const features = [
    {
      key: 'harvest_helper_enabled' as keyof FeatureSettings,
      name: 'Harvest Helper',
      icon: Wheat,
      emoji: '🌾',
      description: 'Fast insight gatherer for agricultural data',
      usageKey: 'harvest_helper'
    },
    {
      key: 'tech_tillage_enabled' as keyof FeatureSettings,
      name: 'Tech Tillage',
      icon: Wrench,
      emoji: '🔧',
      description: 'Lays foundation for digital growth',
      usageKey: 'tech_tillage'
    },
    {
      key: 'innovator_enabled' as keyof FeatureSettings,
      name: 'InnoVator',
      icon: Rocket,
      emoji: '🚀',
      description: 'Drives innovation & transformation',
      usageKey: 'innovator'
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            const blocked = isFeatureBlocked(feature.usageKey);
            
            return (
              <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span className="text-lg">{feature.emoji}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">
                        Usage: {getUsageDisplay(feature.usageKey)}
                      </Badge>
                      {blocked && (
                        <Badge variant="destructive">
                          Limit Reached
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings[feature.key]}
                  onCheckedChange={(value) => updateSetting(feature.key, value)}
                  disabled={blocked && !settings[feature.key]}
                />
              </div>
            );
          })}
          
          {/* Savannah Tone Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">💬</span>
              </div>
              <div>
                <h3 className="font-semibold">Savannah Tone</h3>
                <p className="text-sm text-muted-foreground">CriderGPT responds in Savannah's tone, style, and phrasing</p>
                <Badge variant="outline">No usage limits</Badge>
              </div>
            </div>
            <Switch
              checked={settings.savannah_tone_enabled}
              onCheckedChange={(value) => updateSetting('savannah_tone_enabled', value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}