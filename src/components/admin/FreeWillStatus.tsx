import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { useFreeWillSettings, FREE_WILL_PLAN_LIMITS } from '@/hooks/useFreeWillSettings';

export function FreeWillStatus() {
  const fw = useFreeWillSettings();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary" />
          Free Will (always on)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Every CriderGPT model thinks autonomously by default. Your plan
          decides how deep it can go in one turn.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{fw.plan}</Badge>
          <Badge variant="outline">{fw.maxReasoningSteps} reasoning steps</Badge>
          <Badge variant="outline">{fw.maxToolCallsPerTurn} tools/turn</Badge>
          {fw.allowAutoSideEffects && <Badge>auto SMS/writes</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          {Object.entries(FREE_WILL_PLAN_LIMITS).map(([k, v]) => (
            <div
              key={k}
              className={`rounded border p-2 ${
                k === fw.plan ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="font-semibold capitalize">{k}</div>
              <div className="text-muted-foreground">
                {v.maxReasoningSteps} steps · {v.maxToolCallsPerTurn} tools
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
