
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, CreditCard } from "lucide-react";
import { useState } from "react";

export function ManageSubscription() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to manage your subscription.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe Customer Portal in the same tab
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription management portal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Manage Subscription
        </CardTitle>
        <CardDescription>
          Cancel, upgrade, or update your payment method through Stripe's secure portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleManageSubscription}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            "Opening Portal..."
          ) : (
            <>
              Manage Subscription <ExternalLink className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
