
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";
import { useLifetimePlan } from "@/hooks/useLifetimePlan";

const Pricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans } = usePlanConfigurations();
  const { isLifetimeAvailable, getSlotsRemaining, getPromotionMessage, getSoldOutMessage } = useLifetimePlan();

  // Price IDs for Stripe integration
  const priceIdMap: Record<string, string> = {
    'plus': 'price_1QWi0fIJp5CmkQf3fE8NSFZE',
    'pro': 'price_1QWi1AIJp5CmkQf3Y8wQEP2V',
    'lifetime': 'price_lifetime_founder_plan' // Replace with actual Stripe price ID
  };

  const handlePlanSelect = async (planName: string) => {
    // Check lifetime plan availability
    if (planName === 'lifetime' && !isLifetimeAvailable()) {
      toast({
        title: "Plan Unavailable",
        description: getSoldOutMessage(),
        variant: "destructive",
      });
      return;
    }

    const priceId = priceIdMap[planName];
    
    if (!priceId) {
      // Free plan - redirect to main dashboard
      window.location.href = '/';
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
        body: { priceId, planName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe checkout in same tab
        window.location.href = data.url;
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
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Safe Mode Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            ✅ Site Restored – CriderGPT Dashboard Safe Mode
          </h1>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg">
            Unlock the full potential of CriderGPT with our flexible pricing options
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.plan_name}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                plan.plan_name === 'lifetime'
                  ? "border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-br from-yellow-50/10 to-orange-50/10 shadow-lg shadow-yellow-400/20"
                  : plan.plan_name === 'pro'
                  ? "border-cyber-blue bg-cyber-blue/5 shadow-lg shadow-cyber-blue/20"
                  : "border-border bg-card hover:border-cyber-blue/50"
              }`}
            >
              {plan.plan_name === 'lifetime' && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-0 font-bold"
                >
                  🏆 Founder Only
                </Badge>
              )}
              {plan.plan_name === 'pro' && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyber-blue to-tech-accent text-background border-0"
                >
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-xl font-bold mb-2 ${
                  plan.plan_name === 'lifetime' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent'
                    : 'text-foreground'
                }`}>
                  {plan.plan_display_name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className={`text-3xl font-bold ${
                    plan.plan_name === 'lifetime' 
                      ? 'text-yellow-500'
                      : 'text-cyber-blue'
                  }`}>
                    ${plan.price_monthly}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {plan.plan_name === 'lifetime' ? 'once' : '/month'}
                  </span>
                </div>
                
                {/* Lifetime plan special messaging */}
                {plan.plan_name === 'lifetime' && isLifetimeAvailable() && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-yellow-600">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">{getSlotsRemaining()} spots left</span>
                    </div>
                    <p className="text-xs text-yellow-600/80">
                      {getPromotionMessage()}
                    </p>
                  </div>
                )}
                
                {plan.plan_name === 'lifetime' && !isLifetimeAvailable() && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    Sold Out - Thanks to our 35 founders!
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
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
                  plan.plan_name === 'lifetime'
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-black font-bold"
                    : plan.plan_name === 'pro'
                    ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                    : "bg-cyber-blue hover:bg-cyber-blue/90"
                }`}
                size="lg"
                disabled={loading === plan.plan_name || (plan.plan_name === 'lifetime' && !isLifetimeAvailable())}
                onClick={() => handlePlanSelect(plan.plan_name)}
              >
                {loading === plan.plan_name 
                  ? "Processing..." 
                  : plan.plan_name === "free" 
                  ? "Get Started Free" 
                  : plan.plan_name === "lifetime" && !isLifetimeAvailable()
                  ? "Sold Out"
                  : plan.plan_name === "lifetime"
                  ? "Secure Founder Spot"
                  : "Get Started"
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
