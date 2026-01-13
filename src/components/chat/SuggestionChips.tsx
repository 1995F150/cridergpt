import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/hooks/usePredictiveSuggestions";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSuggestionClick: (text: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function SuggestionChips({
  suggestions,
  onSuggestionClick,
  onRefresh,
  isLoading = false,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Sparkles className="h-3 w-3" />
        <span className="hidden sm:inline">Suggestions:</span>
      </div>
      
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 px-2 py-1 text-xs rounded-full",
                "bg-accent/50 hover:bg-accent border-accent/50",
                "transition-all duration-200 hover:scale-105"
              )}
              onClick={() => onSuggestionClick(suggestion.text)}
            >
              {suggestion.icon && (
                <span className="mr-1">{suggestion.icon}</span>
              )}
              <span className="max-w-[150px] sm:max-w-[200px] truncate">
                {suggestion.text}
              </span>
              {suggestion.confidence >= 0.7 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-4 px-1 text-[10px] bg-primary/20"
                >
                  ⚡
                </Badge>
              )}
            </Button>
          ))}
          
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
