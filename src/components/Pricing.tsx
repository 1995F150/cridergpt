import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";
import { useInAppPurchase } from "@/hooks/useInAppPurchase";


const Pricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans } = usePlanConfigurations();
  const { purchaseProduct, platform } = useInAppPurchase();

  // Native digital goods must go through Play Billing / StoreKit per store policy.
  const iapProductMap: Record<string, string> = {
    plus: "cridergpt_plus_monthly",
    pro: "cridergpt_pro_monthly",
  };

// Auth state for clearer CTA text
const [isSignedIn, setIsSignedIn] = useState(false);
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setIsSignedIn(!!data.session));
  const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
    setIsSignedIn(!!session);
  });
  return () => authListener.subscription.unsubscribe();
}, []);

  // Stripe Price IDs (updated March 2026)
  const priceIdMap: Record<string, string> = {
    plus: "price_1TExZhP90uC07RqGdJ8loF2z",
    pro: "price_1TExa8P90uC07RqGHYMMlGbX",
  };

  const handlePlanSelect = async (planName: string) => {
    const priceId = priceIdMap[planName];
    if (!priceId) {
      window.location.href = "/";
      return;
    }

    setLoading(planName);

    // On native iOS/Android, route to IAP instead of Stripe (Play/App Store policy).
    if (platform === "ios" || platform === "android") {
      try {
        const productId = iapProductMap[planName];
        if (!productId) throw new Error("No IAP product mapped for this plan");
        await purchaseProduct(productId);
      } catch (err: any) {
        toast({
          title: "In-App Purchase Error",
          description: err?.message || "Failed to start in-app purchase",
          variant: "destructive",
        });
      } finally {
        setLoading(null);
      }
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log('💳 No session found - redirecting to auth');
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe to a plan.",
          variant: "destructive",
        });
        window.location.href = "/auth";
        return;
      }

      console.log('💳 Calling create-checkout with:', { priceId, planName });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, planName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("💳 Checkout response:", data, error);

      if (error) {
        console.error('💳 Checkout error:', error);
        throw error;
      }
      if (data?.url) {
        console.log('💳 Redirecting to checkout URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('💳 No checkout URL returned from server');
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
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
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            Simple, Affordable Plans
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you need more AI power, livestock tracking & premium tools.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            ✅ All plans include 30+ calculators, FFA tools & community features
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.plan_name}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                plan.plan_name === "pro"
                  ? "border-cyber-blue bg-cyber-blue/5 shadow-lg shadow-cyber-blue/20"
                  : "border-border bg-card hover:border-cyber-blue/50"
              }`}
            >
              {plan.plan_name === "pro" && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyber-blue to-tech-accent text-background border-0"
                >
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {plan.plan_display_name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold text-cyber-blue">
                    ${plan.price_monthly}
                  </span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.plan_name === "pro"
                    ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                    : "bg-cyber-blue hover:bg-cyber-blue/90"
                }`}
                size="lg"
                disabled={loading === plan.plan_name}
                onClick={() => handlePlanSelect(plan.plan_name)}
              >
                {loading === plan.plan_name ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : !isSignedIn ? (
                  "Sign in to subscribe"
                ) : plan.plan_name === "free" ? (
                  "Get Started Free"
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;



