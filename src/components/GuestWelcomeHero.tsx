import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Tractor, Flame, Mic, BookOpen } from 'lucide-react';

interface GuestWelcomeHeroProps {
  onSuggestionClick: (message: string) => void;
  messagesRemaining: number;
}

const quickStarts = [
  { icon: Tractor, label: "Crop rotation plan", prompt: "Help me plan a 3-year crop rotation for 50 acres in Virginia" },
  { icon: Flame, label: "Welding rod guide", prompt: "What's the best welding rod for mild steel and what settings should I use?" },
  { icon: BookOpen, label: "FFA speech tips", prompt: "What should I say in my FFA Creed speaking contest?" },
  { icon: Mic, label: "Voltage calculator", prompt: "Calculate voltage drop for 100ft of 12AWG wire at 20 amps" },
];

export function GuestWelcomeHero({ onSuggestionClick, messagesRemaining }: GuestWelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-6 md:py-10 max-w-2xl mx-auto">
      <img 
        src="/cridergpt-logo.png" 
        alt="CriderGPT" 
        className="h-16 w-16 md:h-20 md:w-20 object-contain mb-4"
      />
      <h2 className="text-xl md:text-2xl font-bold mb-1 text-foreground">
        CriderGPT — AI for Farming, Welding & FFA
      </h2>
      <p className="text-muted-foreground text-sm md:text-base mb-3 max-w-md">
        Built by Jessie Crider, FFA Historian 2025–2026. Ask about agriculture, mechanics, code, or anything else.
      </p>

      <Badge className="bg-primary/10 text-primary border-primary/20 mb-5 text-xs md:text-sm px-3 py-1">
        <Sparkles className="h-3 w-3 mr-1.5" />
        Try it free — {messagesRemaining} messages, no signup needed
      </Badge>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {quickStarts.map((qs, i) => (
          <Button
            key={i}
            variant="outline"
            className="text-left h-auto py-2.5 px-3 gap-2 justify-start border-border hover:bg-accent/10"
            onClick={() => onSuggestionClick(qs.prompt)}
          >
            <qs.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs md:text-sm text-foreground">{qs.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
