
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function AISettings() {
  const { toast } = useToast();

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} will be available in a future update.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Preferences</CardTitle>
          <CardDescription>
            Configure which AI models to use for different tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("AI Model Selection")}
            className="w-full justify-start"
          >
            Configure Default Models
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Response Preferences")}
            className="w-full justify-start"
          >
            Response Style Preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your API keys for external services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("API Key Management")}
            className="w-full justify-start"
          >
            Manage OpenAI API Key
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Google Integration")}
            className="w-full justify-start"
          >
            Configure Google Services
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context & Memory</CardTitle>
          <CardDescription>
            Configure how AI remembers your preferences and context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Context Management")}
            className="w-full justify-start"
          >
            Manage Conversation History
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Memory Settings")}
            className="w-full justify-start"
          >
            Personal AI Memory Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
