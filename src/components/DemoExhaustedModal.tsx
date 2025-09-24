import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

interface DemoExhaustedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoExhaustedModal({ open, onOpenChange }: DemoExhaustedModalProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSignUp = () => {
    setIsNavigating(true);
    window.location.href = '/auth?mode=signup';
  };

  const handleLogIn = () => {
    setIsNavigating(true);
    window.location.href = '/auth?mode=login';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-cyber-blue/20 to-tech-accent/20 rounded-full">
            <Sparkles className="w-8 h-8 text-cyber-blue" />
          </div>
          
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            You've Used Your Free Demo
          </DialogTitle>
          
          <DialogDescription className="text-center text-base text-muted-foreground">
            Thanks for trying CriderGPT! To continue using our AI assistant and unlock all features, please sign up for a free account or log in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Demo Summary */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-cyber-blue" />
              <span className="font-semibold text-foreground">Demo Complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You've sent <Badge variant="secondary">1 message</Badge> to our AI assistant. 
              Sign up to continue the conversation and access all CriderGPT features.
            </p>
          </div>

          {/* Free Plan Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">What you get with a free account:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyber-blue" />
                13 AI chat tokens per month
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyber-blue" />
                5 calculators per day (Soil Health, Spray Mix, Irrigation ≤10 acres)
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyber-blue" />
                2 documents per day (SAE logs, watermarked invoices)
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyber-blue" />
                5 TTS requests per month
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyber-blue" />
                Basic agriculture tools and FFA support
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={handleSignUp}
              disabled={isNavigating}
              className="w-full bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90 text-white font-semibold py-3"
              size="lg"
            >
              Sign Up Free
              {isNavigating && <div className="ml-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            </Button>
            
            <Button 
              onClick={handleLogIn}
              disabled={isNavigating}
              variant="outline"
              className="w-full border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/10"
              size="lg"
            >
              Log In
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            No credit card required • Free forever • Upgrade anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}