import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, Send, Trash2, Loader2 } from "lucide-react";

interface PCEvent {
  id: string;
  event_type: string;
  source_label: string | null;
  payload: any;
  created_at: string;
}

export default function PCFeed() {
  const [events, setEvents] = useState<PCEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmd, setCmd] = useState("");
  const [cmdPayload, setCmdPayload] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("pc_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setEvents((data as PCEvent[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("pc-events-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pc_events" }, (p) => {
        setEvents((prev) => [p.new as PCEvent, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const queueCommand = async () => {
    if (!cmd.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      let payload: any = {};
      if (cmdPayload.trim()) {
        try { payload = JSON.parse(cmdPayload); }
        catch { payload = { message: cmdPayload }; }
      }
      const { error } = await supabase.from("pc_outbox").insert({
        user_id: user.id, command: cmd.trim(), payload,
      });
      if (error) throw error;
      toast.success("Command queued — PC will pick it up on next poll");
      setCmd(""); setCmdPayload("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all events?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("pc_events").delete().eq("user_id", user.id);
    setEvents([]);
    toast.success("Cleared");
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7" /> PC Live Feed
            </h1>
            <p className="text-muted-foreground text-sm">Realtime stream from your linked PC.</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </header>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Send Command to PC</h2>
          <Input placeholder="command (e.g. open_browser)" value={cmd} onChange={(e) => setCmd(e.target.value)} />
          <Input placeholder='payload (JSON or text)' value={cmdPayload} onChange={(e) => setCmdPayload(e.target.value)} />
          <Button onClick={queueCommand} disabled={sending || !cmd.trim()} className="w-full">
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Queue Command
          </Button>
          <p className="text-xs text-muted-foreground">
            PC must be running <code className="bg-muted px-1 rounded">pc-agent-loop.cmd</code> to receive.
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Events ({events.length})</h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No events yet. Run <code className="bg-muted px-1 rounded">push-event.cmd</code> on your PC.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{e.event_type}</Badge>
                      {e.source_label && <span className="text-xs text-muted-foreground">{e.source_label}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
