import { useEffect, useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";

interface PcEvent {
  id: string;
  event_type: string;
  source_label: string | null;
  payload: any;
  created_at: string;
}

export default function ServerConsole() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PcEvent[]>([]);
  const [cmdType, setCmdType] = useState("shell");
  const [cmdBody, setCmdBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("pc_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setEvents(data || []);
    };
    load();

    const ch = (supabase as any)
      .channel("devhub-pc-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pc_events", filter: `user_id=eq.${user.id}` },
        (p: any) => setEvents((prev) => [p.new, ...prev].slice(0, 100)))
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user]);

  const send = async () => {
    if (!user || !cmdBody.trim()) return;
    setSending(true);
    const { error } = await (supabase as any).from("pc_outbox").insert({
      user_id: user.id,
      command_type: cmdType,
      payload: { body: cmdBody },
      status: "pending",
    });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success("Queued for PC agent"); setCmdBody(""); }
  };

  const clearAll = async () => {
    if (!user) return;
    await (supabase as any).from("pc_events").delete().eq("user_id", user.id);
    setEvents([]);
  };

  return (
    <DevHubPage title="Server AI Console" subtitle="Live stream from your linked PC + outbound command dispatch">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" /> Send Command</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={cmdType} onChange={(e) => setCmdType(e.target.value)} placeholder="shell / python / ai-task" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Body</label>
              <Textarea rows={6} value={cmdBody} onChange={(e) => setCmdBody(e.target.value)} placeholder="dir C:\&#10;or&#10;python --version" className="font-mono text-xs" />
            </div>
            <Button onClick={send} disabled={sending || !cmdBody.trim()} className="w-full">
              {sending ? "Sending..." : "Queue to PC"}
            </Button>
            <p className="text-[10px] text-muted-foreground">Requires <code>pc-agent-loop.cmd</code> running on the target machine.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Live Events ({events.length})</CardTitle>
            <Button size="sm" variant="ghost" onClick={clearAll}><Trash2 className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No events yet. Start the PC agent.</p>}
              {events.map((e) => (
                <div key={e.id} className="border border-border rounded p-2 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-primary">{e.event_type}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                  {e.source_label && <div className="text-muted-foreground">from: {e.source_label}</div>}
                  <pre className="mt-1 bg-muted/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(e.payload, null, 2)}</pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
