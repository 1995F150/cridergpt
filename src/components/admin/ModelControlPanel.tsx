import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Server, Cpu, Save } from "lucide-react";
import { CRIDERGPT_MODELS } from "@/config/criderGPTModels";

type Backend = "engine" | "ubuntu";
interface ModelControl {
  chat_backend: Backend;
  default_server_model: string;
  map: Record<string, string>;
}
const EMPTY: ModelControl = { chat_backend: "engine", default_server_model: "", map: {} };
const NONE = "__default__";

function parseModels(raw: unknown): string[] {
  const list: unknown =
    Array.isArray(raw) ? raw : (raw as any)?.models ?? (raw as any)?.data ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((m) => (typeof m === "string" ? m : m?.id ?? m?.name ?? m?.model))
    .filter((m): m is string => typeof m === "string" && m.length > 0);
}

export function ModelControlPanel() {
  const [rowId, setRowId] = useState<string | null>(null);
  const [mc, setMc] = useState<ModelControl>(EMPTY);
  const [serverModels, setServerModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("ai_infrastructure_settings")
        .select("id, advanced_addons")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setMc({ ...EMPTY, ...(data.advanced_addons?.model_control || {}) });
      }
    })();
    loadServerModels();
  }, []);

  async function loadServerModels() {
    setLoadingModels(true);
    setModelsError(null);
    const { data, error } = await supabase.functions.invoke("cridergpt-ubuntu-api", {
      body: { action: "models" },
    });
    setLoadingModels(false);
    if (error || !data?.ok) {
      setModelsError(error?.message || data?.error || `Server returned ${data?.upstream_status ?? "an error"}`);
      return;
    }
    setServerModels(parseModels(data.data));
  }

  async function save() {
    if (!rowId) return;
    setSaving(true);
    const { data: fresh } = await (supabase as any)
      .from("ai_infrastructure_settings")
      .select("advanced_addons")
      .eq("id", rowId)
      .maybeSingle();
    const { error } = await (supabase as any)
      .from("ai_infrastructure_settings")
      .update({
        advanced_addons: { ...(fresh?.advanced_addons || {}), model_control: mc },
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(mc.chat_backend === "ubuntu" ? "Saved — live chat now uses your Ubuntu server" : "Saved");
  }

  const options = Array.from(new Set([...serverModels, ...Object.values(mc.map), mc.default_server_model].filter(Boolean)));

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Model Control
        </CardTitle>
        <CardDescription>
          Pick which of your server-trained models answers when someone chooses a CriderGPT model in chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Live chat runs on</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["engine", "ubuntu"] as Backend[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setMc({ ...mc, chat_backend: b })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mc.chat_backend === b ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="font-medium text-sm">{b === "engine" ? "CriderGPT Engine" : "Ubuntu API"}</div>
                <div className="text-xs text-muted-foreground">
                  {b === "engine" ? "Current setup (/chat)" : "api.cridergpt.com · your trained models"}
                </div>
              </button>
            ))}
          </div>
          {mc.chat_backend === "ubuntu" && (
            <p className="text-xs text-muted-foreground">
              Run a successful test chat below before saving this. Switch back to Engine anytime to roll back.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" />
            {loadingModels ? "Loading server models…" : modelsError ? (
              <span className="text-destructive">Couldn't load models: {modelsError}</span>
            ) : (
              <span>{serverModels.length} model{serverModels.length === 1 ? "" : "s"} on your server</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadServerModels} disabled={loadingModels}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loadingModels ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Default server model</Label>
          <Select value={mc.default_server_model || undefined} onValueChange={(v) => setMc({ ...mc, default_server_model: v })}>
            <SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger>
            <SelectContent>
              {options.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Per-model routing</Label>
          <div className="rounded-lg border divide-y">
            {CRIDERGPT_MODELS.map((cm) => (
              <div key={cm.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {cm.name}
                    {cm.requiredPlan !== "free" && <Badge variant="secondary" className="text-[10px]">{cm.requiredPlan}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{cm.tagline}</div>
                </div>
                <Select
                  value={mc.map[cm.id] || NONE}
                  onValueChange={(v) => {
                    const map = { ...mc.map };
                    if (v === NONE) delete map[cm.id]; else map[cm.id] = v;
                    setMc({ ...mc, map });
                  }}
                >
                  <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Use default</SelectItem>
                    {options.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={saving || !rowId} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Model Control
        </Button>
      </CardContent>
    </Card>
  );
}
