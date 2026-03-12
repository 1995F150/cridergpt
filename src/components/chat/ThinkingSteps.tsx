import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  emoji: string;
  text: string;
}

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  isThinking: boolean;
  className?: string;
}

export function ThinkingSteps({ steps, isThinking, className }: ThinkingStepsProps) {
  if (!isThinking && steps.length === 0) return null;

  return (
    <div className={cn("flex items-start gap-3 py-3 px-2 md:px-4", className)}>
      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
        <img src="/cridergpt-logo.png" alt="CriderGPT" className="h-5 w-5 object-contain" />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">{i < steps.length - 1 ? "├──" : isThinking ? "├──" : "└──"}</span>
            <span>{step.emoji}</span>
            <span>{step.text}</span>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">└──</span>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
