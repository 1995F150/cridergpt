
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";
import { PromotionalMessages } from "@/components/PromotionalMessages";

export function PaymentPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans, loading: plansLoading, error: plansError } = usePlanConfigurations();

  // Legacy price IDs for Stripe integration
  const priceIdMap = {
    'plus': 'price_1Rell1P90uC07RqG5S4mEjHC',
    'pro': 'price_1RellmP90uC07RqGFSDHaCwu'
  };

  const iconMap = {
    'free': <CreditCard className="h-6 w-6" />,
    'plus': <Zap className="h-6 w-6" />,
    'pro': <Star className="h-6 w-6" />
  };

  const handlePlanSelect = async (plan: any) => {
    const priceId = priceIdMap[plan.plan_name as keyof typeof priceIdMap];
    
    if (!priceId) {
      // Free plan - redirect to auth
      window.location.href = '/auth';
      return;
    }

    setLoading(plan.plan_name);
    
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
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (plansLoading) {
    return (
      <div className="panel h-full w-full p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment plans...</p>
        </div>
      </div>
    );
  }

  if (plansError || !plans.length) {
    return (
      <div className="panel h-full w-full p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-destructive mb-4">Failed to load payment plans</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full w-full p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
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
                  {iconMap[plan.plan_name as keyof typeof iconMap]}
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

                <PromotionalMessages planName={plan.plan_name} />

                <Button
                  className={`w-full ${
                    plan.plan_name === 'pro'
                      ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                  size="lg"
                  disabled={loading === plan.plan_name}
                  onClick={() => handlePlanSelect(plan)}
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
