import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Star, Zap } from 'lucide-react';
import { useFeatureGating } from '@/hooks/useFeatureGating';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  showUpgrade?: boolean;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, showUpgrade = true, fallback }: FeatureGateProps) {
  const { hasFeatureAccess, canUseFeature, currentPlan, getPlanDisplayName } = useFeatureGating();

  const hasAccess = hasFeatureAccess(feature);
  const canUse = canUseFeature(feature);

  if (hasAccess && canUse) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  const getRequiredPlan = (feature: string): string => {
    switch (feature) {
      case 'ai_voice_chat':
      case 'invoicing_system':
      case 'business_intelligence':
      case 'quickbooks_integration':
        return 'pro';
      case 'ai_image_generator':
      case 'document_analyzer':
        return 'plu';
      default:
        return 'plu';
    }
  };

  const requiredPlan = getRequiredPlan(feature);
  const PlanIcon = requiredPlan === 'pro' ? Crown : Star;
  const planColor = requiredPlan === 'pro' ? 'text-yellow-500' : 'text-blue-500';
  const planName = requiredPlan === 'pro' ? 'CriderGPT Pro' : 'CriderGPT Plu';
  const planPrice = requiredPlan === 'pro' ? '$20.99' : '$9.99';

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Feature Locked</CardTitle>
        </div>
        <div className="flex items-center justify-center gap-2">
          <PlanIcon className={`h-4 w-4 ${planColor}`} />
          <Badge variant="outline" className={planColor}>
            {planName} Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          This feature requires an upgrade to {planName} ({planPrice}/month)
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild>
            <a href="/pricing">
              Upgrade to {planName}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/pricing">
              View All Plans
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface UsageLimitGateProps {
  feature: string;
  children: React.ReactNode;
  showLimit?: boolean;
}

export function UsageLimitGate({ feature, children, showLimit = true }: UsageLimitGateProps) {
  const { canUseFeature, getFeatureLimitInfo, currentPlan } = useFeatureGating();

  const canUse = canUseFeature(feature);
  const limitInfo = getFeatureLimitInfo(feature);

  if (canUse) {
    return <>{children}</>;
  }

  if (!showLimit || !limitInfo) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <CardContent className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="font-medium text-orange-700 dark:text-orange-300">
            Usage Limit Reached
          </span>
        </div>
        <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">
          You've used {limitInfo.used} of {limitInfo.unlimited ? 'unlimited' : limitInfo.limit} 
          {' '}for this month.
        </p>
        {currentPlan !== 'pro' && (
          <Button size="sm" asChild>
            <a href="/pricing">
              Upgrade for Higher Limits
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}