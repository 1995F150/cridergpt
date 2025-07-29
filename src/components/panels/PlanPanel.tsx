import { useFeatureNotifications } from '@/hooks/useFeatureNotifications';
import { FeatureNotifications } from '@/components/FeatureNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Crown, Star, Zap, Check, X, ExternalLink } from 'lucide-react';

interface SubscriptionData {
  plan: string;
  tokensUsed: number;
  tokenLimit: number;
  ttsRequests: number;
  ttsLimit: number;
}

export function PlanPanel() {
  const { user } = useAuth();
  const { featureStatus, hasFeature, isPlan } = useFeatureNotifications();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch current usage data
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('user_plan, tokens_used')
        .eq('user_id', user.id)
        .single();

      // Fetch TTS request count for current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: ttsData } = await supabase
        .from('tts_requests')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single();

      const plan = usageData?.user_plan || 'free';
      const tokensUsed = usageData?.tokens_used || 0;
      const ttsRequests = ttsData?.count || 0;

      // Define limits based on plan - matching usageTracker.ts
      const limits = {
        free: { tokens: 13, tts: 5 },
        plu: { tokens: 200, tts: 100 },   // Legacy format
        plus: { tokens: 200, tts: 100 },  // New format  
        pro: { tokens: 500, tts: 9999999 } // Unlimited for Pro (large number)
      };

      const currentLimits = limits[plan as keyof typeof limits] || limits.free;

      setSubscriptionData({
        plan,
        tokensUsed,
        tokenLimit: currentLimits.tokens,
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

  if (loading) {
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

  const planName = (isPlan('pro') ? 'Pro' : (isPlan('plu') || isPlan('plus')) ? 'Plus' : 'Free');
  const planIcon = isPlan('pro') ? Crown : (isPlan('plu') || isPlan('plus')) ? Star : Zap;
  const planColor = isPlan('pro') ? 'text-yellow-500' : (isPlan('plu') || isPlan('plus')) ? 'text-blue-500' : 'text-gray-500';
  const PlanIcon = planIcon;

  const features = [
    { name: 'AI Chat (13 tokens/month)', free: true, plus: false, pro: false },
    { name: 'AI Chat (200 tokens/month)', free: false, plus: true, pro: false },
    { name: 'AI Chat (500 tokens/month)', free: false, plus: false, pro: true },
    { name: 'TTS (5 requests/month)', free: true, plus: false, pro: false },
    { name: 'TTS (100 requests/month)', free: false, plus: true, pro: false },
    { name: 'TTS (Unlimited)', free: false, plus: false, pro: true },
    { name: 'Backend Code Generator', free: false, plus: true, pro: true },
    { name: 'Project Management', free: false, plus: true, pro: true },
    { name: 'Activity Updates', free: false, plus: true, pro: true },
    { name: 'File Upload', free: false, plus: true, pro: true },
    { name: 'Advanced AI Features', free: false, plus: false, pro: true },
    { name: 'Priority Support', free: false, plus: false, pro: true },
  ];

  const tokenUsagePercent = subscriptionData ? (subscriptionData.tokensUsed / subscriptionData.tokenLimit) * 100 : 0;
  const ttsUsagePercent = subscriptionData ? (subscriptionData.ttsRequests / subscriptionData.ttsLimit) * 100 : 0;

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Current Plan Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <PlanIcon className={`h-8 w-8 ${planColor}`} />
            <CardTitle className="text-3xl">Current Plan: {planName}</CardTitle>
          </div>
          <Badge variant={isPlan('pro') ? 'default' : (isPlan('plu') || isPlan('plus')) ? 'secondary' : 'outline'} className="w-fit mx-auto">
            {planName} Subscription
          </Badge>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Statistics */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Token Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used: {subscriptionData.tokensUsed.toLocaleString()}</span>
                    <span>Limit: {subscriptionData.tokenLimit.toLocaleString()}</span>
                  </div>
                  <Progress value={tokenUsagePercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(tokenUsagePercent)}% of monthly limit used
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                TTS Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used: {subscriptionData.ttsRequests}</span>
                    <span>Limit: {subscriptionData.ttsLimit}</span>
                  </div>
                  <Progress value={ttsUsagePercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(ttsUsagePercent)}% of monthly limit used
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

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="font-medium text-muted-foreground">Features</div>
            <div className="text-center font-medium">Free</div>
            <div className="text-center font-medium">Plus</div>
            <div className="text-center font-medium">Pro</div>
            
            {features.map((feature, index) => (
              <div key={index} className="contents">
                <div className="py-2">{feature.name}</div>
                <div className="text-center py-2">
                  {feature.free ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                </div>
                <div className="text-center py-2">
                  {feature.plus ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                </div>
                <div className="text-center py-2">
                  {feature.pro ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management Section */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Subscription Management</h3>
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