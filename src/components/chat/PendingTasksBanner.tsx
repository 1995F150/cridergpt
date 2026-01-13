import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingTask } from "@/hooks/usePendingTasks";

interface PendingTasksBannerProps {
  tasks: PendingTask[];
  onComplete: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onContinue?: (task: PendingTask) => void;
  className?: string;
}

export function PendingTasksBanner({
  tasks,
  onComplete,
  onDismiss,
  onContinue,
  className,
}: PendingTasksBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) {
    return null;
  }

  const displayedTasks = isExpanded ? tasks : tasks.slice(0, 2);
  const hasMore = tasks.length > 2;

  return (
    <Card className={cn(
      "border-accent/50 bg-accent/10",
      "transition-all duration-300",
      className
    )}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm font-medium">
              Unfinished Tasks
            </span>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {tasks.length}
            </Badge>
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  +{tasks.length - 2} more
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {displayedTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start justify-between gap-2",
                "p-2 rounded-md bg-background/50",
                "border border-border/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {task.task_description}
                </p>
                {task.detected_from && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    From: {task.detected_from.substring(0, 30)}...
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {onContinue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                    onClick={() => onContinue(task)}
                  >
                    Continue
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={() => onComplete(task.id)}
                  title="Mark complete"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDismiss(task.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
