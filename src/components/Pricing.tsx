import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Pricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      features: [
        "AI Chat (100 tokens/month)",
        "TTS (5 requests/month)",
        "1 Project",
        "2 API Key Slots", 
        "Basic File Upload (10MB)",
        "System Updates Access",
        "Community Support"
      ],
      highlighted: false,
      priceId: null // Free plan doesn't need Stripe
    },
    {
      name: "Plus",
      price: "$9.99",
      period: "/month",
      features: [
        "AI Chat (10,000 tokens/month)",
        "TTS (100 requests/month)",
        "Backend Code Generator",
        "Project Management (5 projects)",
        "5 API Key Slots",
        "Standard File Upload (100MB)",
        "Activity Updates Tracking",
        "System Updates Access",
        "Email Support"
      ],
      highlighted: false,
      priceId: "price_1QWi0fIJp5CmkQf3fE8NSFZE" // Replace with your actual price ID
    },
    {
      name: "Pro",
      price: "$20.99",
      period: "/month",
      features: [
        "AI Chat (100,000 tokens/month)",
        "TTS (Unlimited)",
        "Advanced Backend Code Generator",
        "Unlimited Projects",
        "Unlimited API Keys", 
        "Premium File Upload (1GB)",
        "Advanced Activity Analytics",
        "Real-time Updates & Notifications",
        "FS22/FS25 Mod Deployment",
        "Priority Support",
        "Custom Automation Scripts",
        "Advanced Security Features"
      ],
      highlighted: true,
      priceId: "price_1QWi1AIJp5CmkQf3Y8wQEP2V" // Replace with your actual price ID
    }
  ];

  const handlePlanSelect = async (plan: typeof plans[0]) => {
    if (!plan.priceId) {
      // Free plan - redirect to auth
      window.location.href = '/auth';
      return;
    }

    setLoading(plan.name);
    
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
        body: { priceId: plan.priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
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
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg">
            Unlock the full potential of CriderOS with our flexible pricing options
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 transition-all duration-300 ${
                plan.highlighted
                  ? "border-cyber-blue bg-cyber-blue/5 transform scale-105 shadow-lg shadow-cyber-blue/20"
                  : "border-border bg-card hover:border-cyber-blue/50"
              }`}
            >
              {plan.highlighted && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyber-blue to-tech-accent text-background border-0"
                >
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-cyber-blue">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
                    : "bg-cyber-blue hover:bg-cyber-blue/90"
                }`}
                size="lg"
                disabled={loading === plan.name}
                onClick={() => handlePlanSelect(plan)}
              >
                {loading === plan.name 
                  ? "Processing..." 
                  : plan.name === "Free" ? "Get Started Free" : "Get Started"
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