
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";
import { PromotionalMessages } from "@/components/PromotionalMessages";

const Pricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans, loading: plansLoading, error: plansError } = usePlanConfigurations();

  // Legacy price IDs for Stripe integration
  const priceIdMap = {
    'plus': 'price_1QWi0fIJp5CmkQf3fE8NSFZE',
    'pro': 'price_1QWi1AIJp5CmkQf3Y8wQEP2V'
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
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing plans...</p>
        </div>
      </section>
    );
  }

  if (plansError || !plans.length) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-destructive mb-4">Failed to load pricing plans</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg">
            Unlock the full potential of CriderGPT with our flexible pricing options
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.plan_name}
              className={`relative rounded-2xl p-8 border-2 transition-all duration-300 ${
                plan.plan_name === 'pro'
                  ? "border-cyber-blue bg-cyber-blue/5 transform scale-105 shadow-lg shadow-cyber-blue/20"
                  : "border-border bg-card hover:border-cyber-blue/50"
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

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.plan_display_name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-cyber-blue">
                    ${plan.price_monthly}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-4 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <PromotionalMessages planName={plan.plan_name} />

              <Button
                className={`w-full ${
                  plan.plan_name === 'pro'
                    ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                    : "bg-cyber-blue hover:bg-cyber-blue/90"
                }`}
                size="lg"
                disabled={loading === plan.plan_name}
                onClick={() => handlePlanSelect(plan)}
              >
                {loading === plan.plan_name 
                  ? "Processing..." 
                  : plan.plan_name === "free" ? "Get Started Free" : "Get Started"
                }
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground italic">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
