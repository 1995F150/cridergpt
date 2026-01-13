import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Brain, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatternDetection, type UserPattern } from "@/hooks/usePatternDetection";
import { useAuth } from "@/contexts/AuthContext";

interface PatternMemoryBadgeProps {
  className?: string;
}

export function PatternMemoryBadge({ className }: PatternMemoryBadgeProps) {
  const { user } = useAuth();
  const { getTopPatterns, clearAllPatterns } = usePatternDetection();
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPatterns();
    }
  }, [user]);

  const loadPatterns = async () => {
    setIsLoading(true);
    const topPatterns = await getTopPatterns(5);
    setPatterns(topPatterns);
    setIsLoading(false);
  };

  const handleClearPatterns = async () => {
    await clearAllPatterns();
    setPatterns([]);
  };

  if (!user) return null;

  const patternCount = patterns.length;
  const avgConfidence = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    : 0;

  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1.5",
              "bg-primary/10 hover:bg-primary/20",
              "border border-primary/20",
              className
            )}
          >
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">
              {patternCount > 0 ? `${patternCount} patterns` : "Learning..."}
            </span>
            {avgConfidence > 0.6 && (
              <Sparkles className="h-3 w-3 text-yellow-500" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Your Patterns
              </h4>
              {patterns.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleClearPatterns}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Clear all patterns
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              CriderGPT learns from your conversations to provide better suggestions.
            </p>

            {isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                Loading patterns...
              </div>
            ) : patterns.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No patterns detected yet. Keep chatting!
              </div>
            ) : (
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {pattern.pattern_type}
                      </Badge>
                      <span className="text-sm capitalize">
                        {pattern.pattern_key.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {patterns.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  Confidence increases as patterns repeat. Unused patterns decay over time.
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
