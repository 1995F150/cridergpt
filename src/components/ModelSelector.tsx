
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Lock, Zap, Brain, Sparkles, Settings } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  requiredPlan: 'free' | 'plus' | 'pro';
  speed: 'fast' | 'medium' | 'slow';
  capability: 'basic' | 'advanced' | 'premium';
}

const models: ModelOption[] = [
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
    requiredPlan: 'plu',
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

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Get user's current plan (you may need to adjust this based on your auth context)
  const userPlan = user?.app_metadata?.plan || 'free';
  
  const hasAccess = (requiredPlan: string) => {
    const planHierarchy = { 'free': 0, 'plu': 1, 'pro': 2 };
    return planHierarchy[userPlan as keyof typeof planHierarchy] >= planHierarchy[requiredPlan as keyof typeof planHierarchy];
  };

  const selectedModelData = models.find(model => model.id === selectedModel) || models[0];

  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model && hasAccess(model.requiredPlan)) {
      onModelChange(modelId);
      setIsOpen(false);
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'slow': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getCapabilityColor = (capability: string) => {
    switch (capability) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <selectedModelData.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedModelData.name}</span>
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Choose AI Model
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <RadioGroup value={selectedModel} onValueChange={handleModelSelect}>
            {models.map((model) => {
              const IconComponent = model.icon;
              const locked = !hasAccess(model.requiredPlan);
              
              return (
                <div
                  key={model.id}
                  className={`relative rounded-lg border p-4 transition-colors ${
                    selectedModel === model.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  } ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={model.id} 
                      id={model.id}
                      disabled={locked}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={model.id} className="flex items-center gap-2 font-medium">
                        <IconComponent className="h-4 w-4" />
                        {model.name}
                        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      
                      <p className="text-sm text-muted-foreground">
                        {model.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className={getCapabilityColor(model.capability)}>
                          {model.capability}
                        </Badge>
                        <span className={`font-medium ${getSpeedColor(model.speed)}`}>
                          {model.speed}
                        </span>
                        {model.requiredPlan !== 'free' && (
                          <Badge variant="secondary" className="text-xs">
                            {model.requiredPlan.toUpperCase()} Plan
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <div className="text-center">
                        <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Upgrade to {model.requiredPlan.toUpperCase()} required
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </RadioGroup>
          
          <div className="text-xs text-muted-foreground text-center border-t pt-3">
            Current plan: <span className="font-medium capitalize">{userPlan}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSelector;
