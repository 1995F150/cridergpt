
import { Heart } from "lucide-react";

export function DedicationMessage() {
  return (
    <div className="flex items-center justify-center gap-2 p-3 mb-4 bg-gradient-to-r from-pink-50 to-red-50 dark:from-pink-950/20 dark:to-red-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
      <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400 fill-current" />
      <div className="text-center">
        <div className="text-sm font-medium text-pink-700 dark:text-pink-300">
          💖 Carli — August 14th, 2025
        </div>
        <div className="text-xs text-pink-600 dark:text-pink-400 italic">
          "I love you. You're the one. Always."
        </div>
      </div>
      <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400 fill-current" />
    </div>
  );
}
