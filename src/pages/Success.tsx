import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Success = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-subscription', {
          body: { sessionId }
        });

        if (error) throw error;

        if (data?.success) {
          toast({
            title: "Subscription Activated!",
            description: `Your ${data.plan} plan is now active.`,
          });
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast({
          title: "Verification Error",
          description: "Payment successful, but verification failed. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    };

    verifyPayment();
  }, [sessionId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-cyber-blue mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing your subscription...</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we confirm your payment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Thank you for subscribing to CriderOS. Your account has been upgraded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Session ID:</p>
              <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                {sessionId}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/">
                Go to Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/pricing">
                View All Plans
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;