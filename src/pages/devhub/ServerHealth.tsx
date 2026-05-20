import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ServerHealth() {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fix, setFix] = useState("");
  const [fixing, setFixing] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("system-diagnostics", { body: {} });
      if (error) throw error;
      setDiag(data);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const askAI = async () => {
    if (!diag) return;
    setFixing(true); setFix("");
    try {
      const { data } = await supabase.functions.invoke("chat-with-ai", {
        body: { model: "cridergpt-reasoning", messages: [
          { role: "system", content: "You are a server SRE. Given diagnostic JSON, list issues found and exact bash/docker commands to fix each one." },
          { role: "user", content: JSON.stringify(diag, null, 2) }
        ]}
      });
      setFix(data?.message || data?.content || JSON.stringify(data));
    } catch (e: any) { toast.error(e.message); } finally { setFixing(false); }
  };

  return (
    <DevHubPage title="Server Health & Self-Repair" subtitle="Diagnostics + AI repair plan">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> System Snapshot</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={run} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Diagnostics"}</Button>
              <Button size="sm" variant="secondary" onClick={askAI} disabled={!diag || fixing}>{fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : "AI Repair Plan"}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/30 p-3 rounded max-h-[300px] overflow-y-auto">{diag ? JSON.stringify(diag, null, 2) : "Click Run Diagnostics"}</pre>
          </CardContent>
        </Card>
        {fix && (
          <Card>
            <CardHeader><CardTitle className="text-base">AI Repair Plan</CardTitle></CardHeader>
            <CardContent><pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded">{fix}</pre></CardContent>
          </Card>
        )}
      </div>
    </DevHubPage>
  );
}
