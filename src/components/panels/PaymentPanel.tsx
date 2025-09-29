import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Star, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePlanConfigurations } from "@/hooks/usePlanConfigurations";
import { ManageSubscription } from "@/components/ManageSubscription";

export function PaymentPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { plans } = usePlanConfigurations();

  // Stripe price IDs
  const priceIdMap: Record<string, string> = {
    plus: "price_1Rell1P90uC07RqG5S4mEjHC",
    pro: "price_1RellmP90uC07RqGFSDHaCwu",
    lifetime: "price_1SAGoNP90uC07RqGhogvN43V",
  };

  const iconMap: Record<string, React.ReactNode> = {
    free: <CreditCard className="h-6 w-6" />,
    plus: <Zap className="h-6 w-6" />,
    pro: <Star className="h-6 w-6" />,
    lifetime: <Crown className="h-6 w-6 text-yellow-500" />,
  };

  const handlePlanSelect = async (planName: string) => {
    const priceId = priceIdMap[planName];

    if (!priceId && planName !== "free") {
      toast({
        title: "Error",
        description: "Invalid plan selected.",
        variant: "destructive",
      });
      return;
    }

    if (planName === "free") {
      window.location.href = "/auth";
      return;
    }

    setLoading(planName);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe or purchase a plan.",
          variant: "destructive",
        });
        window.location.href = "/auth";
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "process-lifetime-payment",
        {
          body: {
            priceId,
            planName,
            userId: session.user.id,
            userEmail: session.user.email,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned.");
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

  // 🔑 Ensure Lifetime shows only once
  const allPlans = [...plans];
  if (!allPlans.some((p) => p.plan_name === "lifetime")) {
    allPlans.push({
      plan_name: "lifetime",
      plan_display_name: "Lifetime Founder",
      price_monthly: 100,
      features: [
        "Unlimited everything forever",
        "Priority support",
        "All future features included",
        "Lifetime Founder badge",
      ],
      limits: {
        tokens: 999999,
        tts: 999999,
        projects: 999999,
        api_keys: 999999,
        file_upload_mb: 999999,
      },
      sort_order: 99,
    });
  }

  return (
    <div className="panel h-full w-full p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            ✅ CriderGPT – Payment & Billing
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose the perfect plan for your needs
          </p>
        </div>

        <ManageSubscription />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {allPlans.map((plan) => (
            <Card
              key={plan.plan_name}
              className={`relative transition-all duration-300 ${
                plan.plan_name === "pro" || plan.plan_name === "lifetime"
                  ? "border-2 border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border border-border hover:border-primary/50"
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

              {plan.plan_name === "lifetime" && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black border-0"
                >
                  Founder Deal
                </Badge>
              )}

              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {iconMap[plan.plan_name] || <CreditCard className="h-6 w-6" />}
                </div>
                <CardTitle className="text-2xl">{plan.plan_display_name}</CardTitle>
                <CardDescription>
                  {plan.plan_name === "free" && "Perfect for getting started"}
                  {plan.plan_name === "plus" && "Enhanced features for power users"}
                  {plan.plan_name === "pro" && "Complete solution for professionals"}
                  {plan.plan_name === "lifetime" &&
                    "One-time payment – no monthly fees"}
                </CardDescription>
                <div className="flex items-baseline justify-center mt-4">
                  <span className="text-4xl font-bold text-primary">
                    ${plan.price_monthly}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {plan.plan_name === "lifetime" ? "one-time" : "/month"}
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

                <Button
                  className={`w-full ${
                    plan.plan_name === "pro" || plan.plan_name === "lifetime"
                      ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                  size="lg"
                  disabled={loading === plan.plan_name}
                  onClick={() => handlePlanSelect(plan.plan_name)}
                >
                  {loading === plan.plan_name
                    ? "Processing..."
                    : plan.plan_name === "free"
                    ? "Get Started Free"
                    : plan.plan_name === "lifetime"
                    ? "Buy Now"
                    : "Subscribe Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
