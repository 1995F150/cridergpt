
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";

export function PaymentPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans } = usePlanConfigurations(); // Using static fallback

  // Legacy price IDs for Stripe integration
  const priceIdMap: Record<string, string> = {
    'plus': 'price_1Rell1P90uC07RqG5S4mEjHC',
    'pro': 'price_1RellmP90uC07RqGFSDHaCwu'
  };

  const iconMap: Record<string, React.ReactNode> = {
    'free': <CreditCard className="h-6 w-6" />,
    'plus': <Zap className="h-6 w-6" />,
    'pro': <Star className="h-6 w-6" />
  };

  const handlePlanSelect = async (planName: string) => {
    const priceId = priceIdMap[planName];
    
    if (!priceId) {
      // Free plan - redirect to auth
      window.location.href = '/auth';
      return;
    }

    setLoading(planName);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe to a plan.",
          variant: "destructive",
        });
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="panel h-full w-full p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Safe Mode Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            ✅ Site Restored – CriderGPT Dashboard Safe Mode
          </h1>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
              Payment & Billing
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.plan_name}
              className={`relative transition-all duration-300 ${
                plan.plan_name === 'pro'
                  ? "border-2 border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border border-border hover:border-primary/50"
              }`}
            >
              {plan.plan_name === 'pro' && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyber-blue to-tech-accent text-background border-0"
                >
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {iconMap[plan.plan_name] || <CreditCard className="h-6 w-6" />}
                </div>
                <CardTitle className="text-2xl">{plan.plan_display_name}</CardTitle>
                <CardDescription>
                  {plan.plan_name === 'free' && 'Perfect for getting started with CriderGPT'}
                  {plan.plan_name === 'plus' && 'Enhanced features for power users'}
                  {plan.plan_name === 'pro' && 'Complete solution for professionals'}
                </CardDescription>
                <div className="flex items-baseline justify-center mt-4">
                  <span className="text-4xl font-bold text-primary">
                    ${plan.price_monthly}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    /month
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Static Upgrade Message */}
                <div className="bg-gradient-to-r from-cyber-blue/10 to-tech-accent/10 p-4 rounded-lg border border-cyber-blue/20 mb-6">
                  <p className="text-sm font-bold text-center leading-relaxed">
                    🚀 Upgrade to CriderGPT+ or Pro for Exclusive Unlocking
                  </p>
                </div>

                <Button
                  className={`w-full ${
                    plan.plan_name === 'pro'
                      ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                  size="lg"
                  disabled={loading === plan.plan_name}
                  onClick={() => handlePlanSelect(plan.plan_name)}
                >
                  {loading === plan.plan_name 
                    ? "Processing..." 
                    : plan.plan_name === "free" ? "Get Started Free" : "Subscribe Now"
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-muted-foreground italic mb-4">
            All paid plans include a 14-day free trial. Cancel anytime.
          </p>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span>✓ Secure payments with Stripe</span>
            <span>✓ No hidden fees</span>
            <span>✓ Instant activation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
