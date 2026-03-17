import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageSquare, ArrowRight, Calculator, Tractor, BookOpen } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          <DialogTitle className="text-center text-2xl font-bold text-foreground">
            You've Used All 5 Demo Messages
          </DialogTitle>
          
          <DialogDescription className="text-center text-base text-muted-foreground">
            Sign up in 10 seconds to keep chatting and unlock 30+ tools — completely free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Google Sign-In — one-click */}
          <GoogleSignInButton className="w-full" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <Button 
            onClick={handleSignUp}
            disabled={isNavigating}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            size="lg"
          >
            Sign Up with Email
            {isNavigating && <div className="ml-2 w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
          </Button>

          {/* Features you'll unlock */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <h4 className="font-semibold text-foreground text-sm mb-2">What you'll unlock for free:</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                13 AI chat tokens per month
              </li>
              <li className="flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-primary" />
                5 calculators/day — Soil Health, Spray Mix, Voltage Drop
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                FFA Record Book, SAE logs, and event planner
              </li>
              <li className="flex items-center gap-2">
                <Tractor className="w-3.5 h-3.5 text-primary" />
                Livestock tracker, irrigation planner, and more
              </li>
            </ul>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            No credit card required • Free forever • Upgrade anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
