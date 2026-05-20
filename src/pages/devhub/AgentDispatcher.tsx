import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AgentDispatcher() {
  const [goal, setGoal] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const fire = async () => {
    if (!goal.trim()) return;
    setRunning(true); setLog(l => [...l, `▶ dispatching: ${goal}`]);
    try {
      const { data, error } = await supabase.functions.invoke("swarm-orchestrator", {
        body: { goal, agent_count: 5 }
      }).catch(async () => {
        return await supabase.functions.invoke("agi-chat", { body: { message: goal } });
      });
      if (error) throw error;
      setLog(l => [...l, `✓ ${JSON.stringify(data).slice(0, 500)}`]);
    } catch (e: any) {
      setLog(l => [...l, `✗ ${e.message}`]);
      toast.error(e.message);
    } finally { setRunning(false); }
  };

  return (
    <DevHubPage title="AGI Agent Dispatcher" subtitle="Background agents for research, scaffolding, refactoring">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> Goal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={4} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Research the cheapest AMD GPU under $400 for local LLM inference and write a comparison table." />
            <Button onClick={fire} disabled={running} className="w-full">
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running</> : "Dispatch Swarm"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Log</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/30 p-3 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap">{log.length ? log.join("\n") : "no activity"}</pre>
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
