
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, Zap, Sparkles, Lock } from "lucide-react";

const models = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for most tasks',
    icon: Zap,
    requiredPlan: 'free',
    speed: 'fast',
    capability: 'basic'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Balanced performance and speed',
    icon: Brain,
    requiredPlan: 'plus',
    speed: 'medium',
    capability: 'advanced'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable model for complex tasks',
    icon: Sparkles,
    requiredPlan: 'pro',
    speed: 'slow',
    capability: 'premium'
  }
];

export function AISettings() {
  const { toast } = useToast();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const { user } = useAuth();

  // Get user's current plan
  const userPlan = user?.app_metadata?.plan || 'free';
  
  const hasAccess = (requiredPlan: string) => {
    const planHierarchy = { 'free': 0, 'plus': 1, 'pro': 2 };
    return planHierarchy[userPlan as keyof typeof planHierarchy] >= planHierarchy[requiredPlan as keyof typeof planHierarchy];
  };

  const handleModelChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model && hasAccess(model.requiredPlan)) {
      setSelectedModel(modelId);
      toast({
        title: "Model Updated",
        description: `Default AI model changed to ${model.name}`,
      });
    } else {
      toast({
        title: "Upgrade Required",
        description: `${model?.name} requires ${model?.requiredPlan.toUpperCase()} plan`,
        variant: "destructive",
      });
    }
  };

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} will be available in a future update.`,
    });
  };

  const getCapabilityColor = (capability: string) => {
    switch (capability) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedModelData = models.find(model => model.id === selectedModel) || models[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default AI Model</CardTitle>
          <CardDescription>
            Choose your preferred AI model for chat conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Model</label>
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <selectedModelData.icon className="h-4 w-4" />
                    <span>{selectedModelData.name}</span>
                    <Badge variant="outline" className={getCapabilityColor(selectedModelData.capability)}>
                      {selectedModelData.capability}
                    </Badge>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => {
                  const IconComponent = model.icon;
                  const locked = !hasAccess(model.requiredPlan);
                  
                  return (
                    <SelectItem 
                      key={model.id} 
                      value={model.id}
                      disabled={locked}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          <Badge variant="outline" className={getCapabilityColor(model.capability)}>
                            {model.capability}
                          </Badge>
                          {model.requiredPlan !== 'free' && (
                            <Badge variant="secondary" className="text-xs">
                              {model.requiredPlan.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <div className="text-xs text-muted-foreground">
              Current plan: <span className="font-medium capitalize">{userPlan}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Preferences</CardTitle>
          <CardDescription>
            Configure how AI responds to your messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Response Style Preferences")}
            className="w-full justify-start"
          >
            Response Style Settings
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleComingSoon("Conversation Memory")}
            className="w-full justify-start"
          >
            Conversation Memory Settings
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
    </div>
  );
}
