import { useFeatureNotifications } from '@/hooks/useFeatureNotifications';
import { FeatureNotifications } from '@/components/FeatureNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Crown, Star, Zap, Check, X, ExternalLink, Lock, Unlock, Volume2 } from 'lucide-react';
import { usePlanConfigurations } from '@/hooks/usePlanConfigurations';
import { PromotionalMessages } from '@/components/PromotionalMessages';
import { ManageSubscription } from '@/components/ManageSubscription';

interface SubscriptionData {
  plan: string;
  messagesUsed: number;
  messageLimit: number;
  ttsRequests: number;
  ttsLimit: number;
}

interface FeatureRequirement {
  feature: string;
  description: string;
  freeAccess: boolean;
  pluAccess: boolean;
  proAccess: boolean;
  requirement?: string;
}

const featureRequirements: FeatureRequirement[] = [
  {
    feature: "AI Chat",
    description: "AI conversations and assistance",
    freeAccess: true,
    pluAccess: true,
    proAccess: true,
    requirement: "15 messages/day on Free, 100 messages/day on Plus, 500 messages/day on Pro"
  },
  {
    feature: "AI Voice Chat", 
    description: "Voice-powered AI conversations",
    freeAccess: false,
    pluAccess: false,
    proAccess: true,
    requirement: "Pro plan required"
  },
  {
    feature: "AI Image Generator",
    description: "Generate custom images with AI",
    freeAccess: false,
    pluAccess: true,
    proAccess: true,
    requirement: "10 images/month on Plus, Unlimited on Pro"
  },
  {
    feature: "Document Analyzer",
    description: "AI-powered document analysis and insights",
    freeAccess: false,
    pluAccess: true,
    proAccess: true,
    requirement: "20 documents/month on Plus, Unlimited on Pro"
  },
  {
    feature: "Invoicing System",
    description: "Professional invoice creation and management",
    freeAccess: false,
    pluAccess: false,
    proAccess: true,
    requirement: "Pro plan required"
  },
  {
    feature: "Agricultural Calculators",
    description: "Specialized farming and agriculture tools",
    freeAccess: true,
    pluAccess: true,
    proAccess: true
  },
  {
    feature: "Business Intelligence",
    description: "Advanced analytics and reporting",
    freeAccess: false,
    pluAccess: false,
    proAccess: true,
    requirement: "Pro plan required"
  },
  {
    feature: "QuickBooks Integration",
    description: "Seamless accounting system integration",
    freeAccess: false,
    pluAccess: false,
    proAccess: true,
    requirement: "Pro plan required"
  },
  {
    feature: "FFA Dashboard + Theme",
    description: "Future Farmers of America specialized interface",
    freeAccess: true,
    pluAccess: true,
    proAccess: true
  },
  {
    feature: "CB & Radio Tuner",
    description: "CB radio scanner and FM tuner interface",
    freeAccess: true,
    pluAccess: true,
    proAccess: true
  }
];

export function PlanPanel() {
  const { user } = useAuth();
  const { featureStatus, hasFeature, isPlan } = useFeatureNotifications();
  const { plans, loading: plansLoading } = usePlanConfigurations();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch current usage data - use messages_sent column
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('user_plan, tokens_used')
        .eq('user_id', user.id)
        .single();

      // Fetch TTS request count for current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: ttsData } = await (supabase as any)
        .from('tts_requests')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single();

      const plan = usageData?.user_plan || 'free';
      // tokens_used now represents messages_sent (daily message count)
      const messagesUsed = usageData?.tokens_used || 0;
      const ttsRequests = ttsData?.count || 0;

      // Define limits based on plan - DAILY MESSAGE LIMITS
      const limits = {
        free: { messages: 15, tts: 5 },
        plu: { messages: 100, tts: 100 },   // Legacy format
        plus: { messages: 100, tts: 100 },  // New format  
        pro: { messages: 500, tts: 9999999 }, // High limit for Pro
        lifetime: { messages: 9999999, tts: 9999999 } // Unlimited for Lifetime
      };

      const currentLimits = limits[plan as keyof typeof limits] || limits.free;

      setSubscriptionData({
        plan,
        messagesUsed,
        messageLimit: currentLimits.messages,
        ttsRequests,
        ttsLimit: currentLimits.tts
      });
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground">Please sign in to view your subscription plan details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || plansLoading) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading plan details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = subscriptionData?.plan || 'free';
  const isLifetime = currentPlan === 'lifetime';
  const planName = isLifetime ? 'Lifetime' : (isPlan('pro') ? 'Pro' : (isPlan('plu') || isPlan('plus')) ? 'Plus' : 'Free');
  const planIcon = isLifetime ? Crown : (isPlan('pro') ? Crown : (isPlan('plu') || isPlan('plus')) ? Star : Zap);
  const planColor = isLifetime ? 'text-yellow-500' : (isPlan('pro') ? 'text-yellow-500' : (isPlan('plu') || isPlan('plus')) ? 'text-blue-500' : 'text-gray-500');
  const PlanIcon = planIcon;

  const messageUsagePercent = subscriptionData ? Math.min((subscriptionData.messagesUsed / subscriptionData.messageLimit) * 100, 100) : 0;
  const ttsUsagePercent = subscriptionData ? (subscriptionData.ttsRequests / subscriptionData.ttsLimit) * 100 : 0;

  const getUserAccess = (feature: FeatureRequirement) => {
    switch (currentPlan) {
      case 'pro':
        return feature.proAccess;
      case 'plus':
      case 'plu':
        return feature.pluAccess;
      default:
        return feature.freeAccess;
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Current Plan Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <PlanIcon className={`h-8 w-8 ${planColor}`} />
            <CardTitle className="text-3xl">Current Plan: {planName}</CardTitle>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="ml-2">
              {currentPlan.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {currentPlan === 'free' && 'Basic features with limited usage'}
            {(currentPlan === 'plus' || currentPlan === 'plu') && 'Enhanced features with higher limits — CriderGPT Plus ($3/mo)'}
            {currentPlan === 'pro' && 'Full power with advanced features — CriderGPT Pro ($7/mo)'}
            {currentPlan === 'lifetime' && 'Unlimited everything forever — CriderGPT Lifetime Founder'}
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Statistics */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Daily Message Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used Today: {subscriptionData.messagesUsed.toLocaleString()}</span>
                    <span>Daily Limit: {subscriptionData.messageLimit === 9999999 ? 'Unlimited' : subscriptionData.messageLimit.toLocaleString()}</span>
                  </div>
                  <Progress value={subscriptionData.messageLimit === 9999999 ? 0 : messageUsagePercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {subscriptionData.messageLimit === 9999999 ? 'Unlimited messages' : `${Math.round(messageUsagePercent)}% of daily limit used`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                TTS Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used: {subscriptionData.ttsRequests}</span>
                    <span>Limit: {subscriptionData.ttsLimit === 9999999 ? 'Unlimited' : subscriptionData.ttsLimit}</span>
                  </div>
                  <Progress value={subscriptionData.ttsLimit === 9999999 ? 0 : ttsUsagePercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {subscriptionData.ttsLimit === 9999999 ? 'Unlimited usage' : `${Math.round(ttsUsagePercent)}% of monthly limit used`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Notifications */}
        <div>
          <FeatureNotifications />
        </div>
      </div>

      {/* Feature Access & Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access & Requirements</CardTitle>
          <p className="text-muted-foreground">
            Overview of features available in your current plan and upgrade options
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
              {featureRequirements.map((feature, index) => {
                const hasAccess = getUserAccess(feature);
                const badge = hasAccess ? '✅' : '🔒';
                return (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{badge}</span>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {feature.feature}
                          {hasAccess ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                              🔒 Locked
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                        {feature.requirement && (
                          <p className="text-xs text-blue-600 mt-1">{feature.requirement}</p>
                        )}
                      </div>
                    </div>
                    {!hasAccess && (
                      <Button size="sm" variant="outline" asChild>
                        <a href="/pricing">
                          Upgrade
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Feature Comparison */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="font-medium text-muted-foreground">Features</div>
              {plans.map(plan => (
                <div key={plan.plan_name} className="text-center font-medium capitalize">
                  {plan.plan_display_name}
                  <div className="text-2xl font-bold text-primary">${plan.price_monthly}/mo</div>
                </div>
              ))}
              
              {/* Get all unique features across all plans */}
              {plans.length > 0 && (() => {
                const allFeatures = new Set<string>();
                plans.forEach(plan => plan.features.forEach(feature => allFeatures.add(feature)));
                
                return Array.from(allFeatures).map((feature, index) => (
                  <div key={index} className="contents">
                    <div className="py-2">{feature}</div>
                    {plans.map(plan => (
                      <div key={plan.plan_name} className="text-center py-2">
                        {plan.features.includes(feature) ? 
                          <Check className="h-4 w-4 text-green-500 mx-auto" /> : 
                          <X className="h-4 w-4 text-red-500 mx-auto" />
                        }
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotional Messages */}
      <Card>
        <CardContent className="p-6">
          <PromotionalMessages planName={subscriptionData?.plan || 'free'} />
        </CardContent>
      </Card>

      {/* Subscription Management Section */}
      <ManageSubscription />

      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Subscription Status</h3>
          <p className="text-muted-foreground mb-4">
            Check your latest subscription status or upgrade your plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={async () => {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData.session?.access_token) {
                  await supabase.functions.invoke('check-subscription', {
                    headers: {
                      Authorization: `Bearer ${sessionData.session.access_token}`,
                    }
                  });
                  // Refresh the page to show updated data
                  window.location.reload();
                }
              }}
            >
              Refresh Subscription Status
            </Button>
            {!isPlan('pro') && (
              <Button asChild>
                <a href="/pricing">
                  Upgrade Plan <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
