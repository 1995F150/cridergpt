
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function TokensCredits() {
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: "Upgrade Coming Soon",
      description: "Paid plans and credit purchasing will be available soon.",
    });
  };

  const credits = {
    available: 2500,
    total: 5000,
    used: 2500
  };

  const percentage = (credits.used / credits.total) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Plan
            <Badge variant="outline">Free Tier</Badge>
          </CardTitle>
          <CardDescription>
            You're currently on the free tier with basic access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Credits Used</span>
              <span>{credits.used} / {credits.total}</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>✓ 5,000 monthly credits</p>
            <p>✓ Basic AI models</p>
            <p>✓ Standard support</p>
            <p>✓ 10GB storage</p>
          </div>
          
          <Button onClick={() => window.location.hash = '#payment'} className="w-full">
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Usage Breakdown</CardTitle>
          <CardDescription>
            See how you've used your credits this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Chat Conversations</span>
              <span className="text-sm font-medium">1,200 credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Code Generation</span>
              <span className="text-sm font-medium">800 credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">File Processing</span>
              <span className="text-sm font-medium">300 credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Image Generation</span>
              <span className="text-sm font-medium">200 credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Upgrades</CardTitle>
          <CardDescription>
            Choose a plan that fits your needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Pro Plan</h4>
                <Badge variant="secondary">$19/month</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                50,000 monthly credits, advanced models, priority support
              </p>
              <Button variant="outline" size="sm" onClick={handleUpgrade}>
                Coming Soon
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Team Plan</h4>
                <Badge variant="secondary">$49/month</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                200,000 monthly credits, team collaboration, custom models
              </p>
              <Button variant="outline" size="sm" onClick={handleUpgrade}>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
