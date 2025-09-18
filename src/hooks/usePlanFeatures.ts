import { useFeatureGating } from './useFeatureGating';

export function usePlanFeatures() {
  const { currentPlan, isPlan, getPlanDisplayName } = useFeatureGating();

  const getFeatureBadge = (feature: string) => {
    const hasAccess = hasFeatureAccess(feature);
    return hasAccess ? '✅' : '🔒';
  };

  const hasFeatureAccess = (feature: string): boolean => {
    const featureMap: Record<string, string[]> = {
      free: [
        'AI Chat (13 tokens/month)',
        'Agricultural Calculators',
        'FFA Dashboard + Theme', 
        'CB & Radio Tuner'
      ],
      plu: [
        'AI Chat (limited - 200 tokens/month)',
        'AI Image Generator (10 images/month)',
        'Document Analyzer (20 docs/month)',
        'Agricultural Calculators',
        'FFA Dashboard + Theme',
        'CB & Radio Tuner',
        'TTS (100 requests/month)',
        'Priority Support'
      ],
      pro: [
        'AI Chat (Unlimited)',
        'AI Voice Chat',
        'AI Image Generator (Unlimited)',
        'Document Analyzer (Unlimited)',
        'Invoicing System',
        'Agricultural Calculators',
        'Business Intelligence',
        'QuickBooks Integration',
        'FFA Dashboard + Theme',
        'CB & Radio Tuner',
        'TTS (Unlimited)',
        'Priority Support',
        'API Access'
      ]
    };

    const planFeatures = featureMap[currentPlan] || featureMap.free;
    return planFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  };

  const getPlanFeatures = (planName: string) => {
    switch (planName) {
      case 'plu':
      case 'plus':
        return [
          { name: 'AI Chat', status: 'limited', description: '200 tokens/month' },
          { name: 'AI Voice Chat', status: 'locked', description: 'Pro required' },
          { name: 'AI Image Generator', status: 'available', description: '10 images/month' },
          { name: 'Document Analyzer', status: 'available', description: '20 docs/month' },
          { name: 'Invoicing System', status: 'locked', description: 'Pro required' },
          { name: 'Agricultural Calculators', status: 'available', description: 'Full access' },
          { name: 'Business Intelligence', status: 'locked', description: 'Pro required' },
          { name: 'QuickBooks Integration', status: 'locked', description: 'Pro required' },
          { name: 'FFA Dashboard + Theme', status: 'available', description: 'Full access' },
          { name: 'CB & Radio Tuner', status: 'available', description: 'Full access' }
        ];
      case 'pro':
        return [
          { name: 'AI Chat', status: 'unlimited', description: 'Unlimited tokens' },
          { name: 'AI Voice Chat', status: 'available', description: 'Full access' },
          { name: 'AI Image Generator', status: 'unlimited', description: 'Unlimited images' },
          { name: 'Document Analyzer', status: 'unlimited', description: 'Unlimited docs' },
          { name: 'Invoicing System', status: 'available', description: 'Full access' },
          { name: 'Agricultural Calculators', status: 'available', description: 'Full access' },
          { name: 'Business Intelligence', status: 'available', description: 'Full access' },
          { name: 'QuickBooks Integration', status: 'available', description: 'Full access' },
          { name: 'FFA Dashboard + Theme', status: 'available', description: 'Full access' },
          { name: 'CB & Radio Tuner', status: 'available', description: 'Full access' }
        ];
      default: // free
        return [
          { name: 'AI Chat', status: 'limited', description: '13 tokens/month' },
          { name: 'AI Voice Chat', status: 'locked', description: 'Upgrade required' },
          { name: 'AI Image Generator', status: 'locked', description: 'Upgrade required' },
          { name: 'Document Analyzer', status: 'locked', description: 'Upgrade required' },
          { name: 'Invoicing System', status: 'locked', description: 'Pro required' },
          { name: 'Agricultural Calculators', status: 'available', description: 'Full access' },
          { name: 'Business Intelligence', status: 'locked', description: 'Pro required' },
          { name: 'QuickBooks Integration', status: 'locked', description: 'Pro required' },
          { name: 'FFA Dashboard + Theme', status: 'available', description: 'Full access' },
          { name: 'CB & Radio Tuner', status: 'available', description: 'Full access' }
        ];
    }
  };

  return {
    currentPlan,
    isPlan,
    getPlanDisplayName,
    hasFeatureAccess,
    getFeatureBadge,
    getPlanFeatures
  };
}