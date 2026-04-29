import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Lock, Zap, Brain, Sparkles, Eye, Settings, Cpu } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { CRIDERGPT_MODELS } from '@/config/criderGPTModels';

const ICONS: Record<string, React.ComponentType<any>> = {
  'cridergpt-4.1': Zap,
  'cridergpt-5.0': Brain,
  'cridergpt-5.0-pro': Sparkles,
  'cridergpt-5.0-vision': Eye,
  'cridergpt-5.0-reasoning': Cpu,
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const { plan: userPlan } = useSubscriptionStatus();
  const [isOpen, setIsOpen] = useState(false);

  const hasAccess = (requiredPlan: string) => {
    const order: Record<string, number> = { free: 0, plus: 1, pro: 2, lifetime: 3 };
    return (order[userPlan] ?? 0) >= (order[requiredPlan] ?? 0);
  };

  const selected =
    CRIDERGPT_MODELS.find(m => m.id === selectedModel) ||
    CRIDERGPT_MODELS.find(m => m.id === 'cridergpt-5.0')!;
  const SelectedIcon = ICONS[selected.id] || Brain;

  const handleSelect = (id: string) => {
    const m = CRIDERGPT_MODELS.find(x => x.id === id);
    if (m && hasAccess(m.requiredPlan)) {
      onModelChange(id);
      setIsOpen(false);
    }
  };

  const speedColor = (s: string) =>
    s === 'fast' ? 'text-green-600' : s === 'medium' ? 'text-yellow-600' : 'text-orange-600';

  const capColor = (c: string) =>
    c === 'basic'
      ? 'bg-muted text-foreground'
      : c === 'advanced'
      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
      : 'bg-purple-500/15 text-purple-700 dark:text-purple-300';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <SelectedIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{selected.name}</span>
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Choose CriderGPT Model
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={selectedModel} onValueChange={handleSelect}>
            {CRIDERGPT_MODELS.map(model => {
              const Icon = ICONS[model.id] || Brain;
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
                        <Icon className="h-4 w-4" />
                        {model.name}
                        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      <p className="text-xs italic text-muted-foreground">{model.tagline}</p>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge variant="outline" className={capColor(model.capability)}>
                          {model.capability}
                        </Badge>
                        <span className={`font-medium ${speedColor(model.speed)}`}>
                          {model.speed}
                        </span>
                        {model.vision && (
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            vision
                          </Badge>
                        )}
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
