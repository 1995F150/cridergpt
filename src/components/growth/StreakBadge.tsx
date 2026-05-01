import { Flame } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function StreakBadge({ className, showLabel = true }: StreakBadgeProps) {
  const { streak } = useStreak();
  if (!streak || streak.current_streak === 0) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400',
        className
      )}
      title={`Current streak: ${streak.current_streak} days · Longest: ${streak.longest_streak}`}
    >
      <Flame className="h-3.5 w-3.5" />
      <span>{streak.current_streak}</span>
      {showLabel && <span className="hidden sm:inline">day streak</span>}
    </div>
  );
}
