import { useEffect, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Trash2, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

type DevTask = {
  id: string;
  title: string;
  prompt: string;
  status: "queued" | "running" | "done" | "failed";
  result: string | null;
  error: string | null;
  model: string;
  priority: number;
  attempts: number;
  created_at: string;
  completed_at: string | null;
};

const statusColor: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary border-primary/40",
  done: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
  failed: "bg-destructive/20 text-destructive border-destructive/40",
};

export default function AutopilotQueue() {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [priority, setPriority] = useState(0);
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("dev_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return toast.error(error.message);
    setTasks((data ?? []) as DevTask[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dev_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dev_tasks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addTask = async () => {
    if (!title.trim() || !prompt.trim()) return toast.error("Title and prompt required");
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return toast.error("Sign in required"); }
    const { error } = await supabase.from("dev_tasks").insert({
      user_id: user.id, title, prompt, priority,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    setTitle(""); setPrompt(""); setPriority(0);
    toast.success("Queued");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("dev-autopilot-runner", { body: {} });
      if (error) throw error;
      toast.success(data?.title ? `Ran: ${data.title}` : "No queued tasks");
    } catch (e: any) {
      toast.error(e.message ?? "Run failed");
    } finally {
      setRunning(false);
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dev_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const retry = async (id: string) => {
    const { error } = await supabase.from("dev_tasks").update({
      status: "queued", error: null, result: null, started_at: null, completed_at: null,
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Re-queued");
  };

  const counts = {
    queued: tasks.filter(t => t.status === "queued").length,
    running: tasks.filter(t => t.status === "running").length,
    done: tasks.filter(t => t.status === "done").length,
    failed: tasks.filter(t => t.status === "failed").length,
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Autopilot Queue</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Drop in tasks. Runner drains every 2 minutes.
              </p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Badge variant="outline">queued {counts.queued}</Badge>
              <Badge className={statusColor.running}>running {counts.running}</Badge>
              <Badge className={statusColor.done}>done {counts.done}</Badge>
              <Badge className={statusColor.failed}>failed {counts.failed}</Badge>
              <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
                {running ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                Run next
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title (e.g. Research cheapest AMD GPU for AI inference)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Detailed prompt — what should the agent produce?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  Priority
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                </label>
                <Button onClick={addTask} disabled={adding} className="ml-auto">
                  {adding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Queue task
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                Empty queue. Drop a task above and the runner picks it up within 2 minutes.
              </p>
            )}
            {tasks.map((t) => (
              <Card key={t.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColor[t.status]}>{t.status}</Badge>
                        {t.priority > 0 && <Badge variant="outline">P{t.priority}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-1 break-words">{t.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.status === "failed" && (
                        <Button size="icon" variant="ghost" onClick={() => retry(t.id)} title="Retry">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  >
                    {expanded === t.id ? "Hide" : "Show"} details
                  </button>
                  {expanded === t.id && (
                    <div className="mt-2 space-y-2 text-xs">
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">Prompt</p>
                        <pre className="whitespace-pre-wrap bg-muted/40 p-2 rounded">{t.prompt}</pre>
                      </div>
                      {t.result && (
                        <div>
                          <p className="font-semibold text-muted-foreground mb-1">Result</p>
                          <pre className="whitespace-pre-wrap bg-muted/40 p-2 rounded max-h-96 overflow-auto">{t.result}</pre>
                        </div>
                      )}
                      {t.error && (
                        <div>
                          <p className="font-semibold text-destructive mb-1">Error</p>
                          <pre className="whitespace-pre-wrap bg-destructive/10 p-2 rounded">{t.error}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
