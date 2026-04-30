import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Server, Zap } from "lucide-react";

type Settings = {
  enabled: boolean;
  local_endpoint: string | null;
  local_model: string;
  prefer_local_for: string[];
  cloud_fallback: boolean;
  max_local_latency_ms: number;
};

const DEFAULTS: Settings = {
  enabled: false,
  local_endpoint: "https://vm.cridergpt.com",
  local_model: "llama3.2:3b",
  prefer_local_for: ["casual", "simple", "classification", "summary"],
  cloud_fallback: true,
  max_local_latency_ms: 30000,
};

export function HybridRouterPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("hybrid_router_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setS(data as Settings);
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("hybrid_router_settings")
      .upsert({ user_id: user.id, ...s, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Router settings saved", description: s.enabled ? "Local-first routing is ON" : "Cloud-only mode" });
    }
  };

  const toggleTask = (task: string) => {
    setS({
      ...s,
      prefer_local_for: s.prefer_local_for.includes(task)
        ? s.prefer_local_for.filter((t) => t !== task)
        : [...s.prefer_local_for, task],
    });
  };

  const tasks = ["casual", "simple", "classification", "summary", "creative", "code", "reasoning"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" /> Hybrid Local-First Router
        </CardTitle>
        <CardDescription>
          Send simple turns to your home Ollama. Hard turns + tools fall back to cloud. Goal: ~80% independence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="font-semibold">Enable local-first routing</Label>
            <p className="text-xs text-muted-foreground">When off, every request goes to cloud.</p>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} disabled={loading} />
        </div>

        <div className="grid gap-2">
          <Label>Local endpoint (Ollama-compatible)</Label>
          <Input
            value={s.local_endpoint ?? ""}
            onChange={(e) => setS({ ...s, local_endpoint: e.target.value })}
            placeholder="https://vm.cridergpt.com"
          />
          <p className="text-xs text-muted-foreground">
            Must expose <code>/api/chat</code>. Use your Cloudflare tunnel URL.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Local model</Label>
          <Input
            value={s.local_model}
            onChange={(e) => setS({ ...s, local_model: e.target.value })}
            placeholder="llama3.2:3b"
          />
          <p className="text-xs text-muted-foreground">
            CPU-friendly picks: <code>llama3.2:3b</code>, <code>qwen2.5:3b</code>, <code>phi3:mini</code>.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Send to local for these task types</Label>
          <div className="flex flex-wrap gap-2">
            {tasks.map((t) => {
              const on = s.prefer_local_for.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTask(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-sm">Cloud fallback on failure</Label>
            <Switch checked={s.cloud_fallback} onCheckedChange={(v) => setS({ ...s, cloud_fallback: v })} />
          </div>
          <div className="grid gap-1">
            <Label className="text-sm">Local timeout (ms)</Label>
            <Input
              type="number"
              value={s.max_local_latency_ms}
              onChange={(e) => setS({ ...s, max_local_latency_ms: Number(e.target.value) || 30000 })}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          <Zap className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save router settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
