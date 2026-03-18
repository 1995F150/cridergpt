import { Loader2 } from 'lucide-react';

export function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px] w-full">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
