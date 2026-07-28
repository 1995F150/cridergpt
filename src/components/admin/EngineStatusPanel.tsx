import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  CloudCog,
  Loader2,
  RefreshCw,
  Save,
  Server,
  TriangleAlert,
  UploadCloud,
  XCircle,
} from "lucide-react";

type RuntimeStatus = {
  engine_id?: string;
  online?: boolean;
  status?: "unknown" | "online" | "degraded" | "offline" | "maintenance";
  base_url?: string;
  engine_version?: string | null;
  git_sha?: string | null;
  hostname?: string | null;
  started_at?: string | null;
  last_heartbeat?: string | null;
  last_health_check?: string | null;
  latency_ms?: number | null;
  active_model?: string | null;
  config_version?: number;
  ack_config_version?: number;
  config_synced?: boolean;
  capabilities?: Record<string, unknown> | string[];
  services?: Record<string, unknown>;
  last_error?: string | null;
};

type EngineSettings = {
  engine_base_url?: string;
  engine_enabled?: boolean;
  engine_request_timeout_ms?: number;
  config_version?: number;
  config_updated_at?: string;
};

type DisplayState = "online" | "degraded" | "maintenance" | "offline" | "unknown";

type ControlResponse = {
  settings?: EngineSettings;
  status?: RuntimeStatus;
  computed?: {
    heartbeat_age_ms?: number | null;
    currently_online?: boolean;
    config_synced?: boolean;
  };
  success?: boolean;
  error?: string;
};

function formatTime(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function serviceOnline(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return record.online === true || record.ready === true || record.configured === true;
  }
  return false;
}

export function EngineStatusPanel() {
  const [settings, setSettings] = useState<EngineSettings>({
    engine_base_url: "https://cridergpt.com/engine/api",
    engine_enabled: true,
    engine_request_timeout_ms: 120000,
  });
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [computedOnline, setComputedOnline] = useState(false);
  const [computedSynced, setComputedSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"refresh" | "save" | "test" | "push" | null>(null);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("engine-control", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as ControlResponse;
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setAction("refresh");
    try {
      const data = await invoke({ action: "get" });
      if (data.settings) setSettings((current) => ({ ...current, ...data.settings }));
      setRuntime(data.status ?? null);
      setComputedOnline(Boolean(data.computed?.currently_online));
      setComputedSynced(Boolean(data.computed?.config_synced));
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : "Could not load engine status");
    } finally {
      setLoading(false);
      if (!quiet) setAction(null);
    }
  }, [invoke]);

  useEffect(() => {
    void refresh(true);
    const interval = window.setInterval(() => void refresh(true), 30000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function saveConnection() {
    setAction("save");
    try {
      const data = await invoke({
        action: "set_url",
        engine_base_url: settings.engine_base_url,
        engine_enabled: settings.engine_enabled,
      });
      if (data.settings) setSettings((current) => ({ ...current, ...data.settings }));
      toast.success("Engine connection saved");
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save engine connection");
    } finally {
      setAction(null);
    }
  }

  async function runAction(kind: "test" | "push") {
    setAction(kind);
    try {
      const data = await invoke({ action: kind });
      toast.success(kind === "test" ? "Engine connection tested" : "Configuration pushed to engine");
      if (data.status) setRuntime(data.status);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Engine ${kind} failed`);
      await refresh(true);
    } finally {
      setAction(null);
    }
  }

  const state = useMemo<DisplayState>(() => {
    if (computedOnline || runtime?.status === "online") return "online";
    if (runtime?.status === "degraded") return "degraded";
    if (runtime?.status === "maintenance") return "maintenance";
    if (runtime?.status === "offline") return "offline";
    return "unknown";
  }, [computedOnline, runtime?.status]);

  const statusBadge = {
    online: { label: "Online", variant: "default" as const, icon: CheckCircle2 },
    degraded: { label: "Degraded", variant: "secondary" as const, icon: TriangleAlert },
    maintenance: { label: "Maintenance", variant: "secondary" as const, icon: TriangleAlert },
    offline: { label: "Offline", variant: "destructive" as const, icon: XCircle },
    unknown: { label: "Unknown", variant: "outline" as const, icon: Activity },
  }[state];
  const StatusIcon = statusBadge.icon;
  const services = Object.entries(runtime?.services ?? {});
  const capabilities = Array.isArray(runtime?.capabilities)
    ? runtime.capabilities.map(String)
    : Object.entries(runtime?.capabilities ?? {}).filter(([, enabled]) => enabled === true).map(([name]) => name);

  return (
    <Card className={state === "offline" ? "border-destructive/70" : state === "online" ? "border-emerald-500/40" : "border-primary/30"}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" /> Engine Connection & Runtime Status
            </CardTitle>
            <CardDescription>
              Live control link between Supabase, the Edge Functions, and the self-hosted CriderGPT Engine.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant} className="gap-1.5">
              <StatusIcon className="h-3.5 w-3.5" /> {statusBadge.label}
            </Badge>
            <Badge variant={computedSynced || runtime?.config_synced ? "default" : "outline"}>
              {computedSynced || runtime?.config_synced ? "Config Synced" : "Out of Sync"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="engine-base-url">Public engine API base URL</Label>
            <Input
              id="engine-base-url"
              value={settings.engine_base_url ?? ""}
              onChange={(event) => setSettings((current) => ({ ...current, engine_base_url: event.target.value }))}
              placeholder="https://cridergpt.com/engine/api"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-xs text-muted-foreground">
              Requests append routes such as /chat, /image/generate, /image/analyze, and /health. The API key stays in Edge Function secrets.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 lg:min-w-48">
            <div>
              <Label>Engine enabled</Label>
              <p className="text-xs text-muted-foreground">Allow Edge Functions to call it.</p>
            </div>
            <Switch
              checked={settings.engine_enabled !== false}
              onCheckedChange={(value) => setSettings((current) => ({ ...current, engine_enabled: value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Metric label="Version" value={runtime?.engine_version ?? "Unknown"} />
          <Metric label="Active model" value={runtime?.active_model ?? "Unknown"} />
          <Metric label="Latency" value={runtime?.latency_ms == null ? "—" : `${runtime.latency_ms} ms`} />
          <Metric label="Hostname" value={runtime?.hostname ?? "Unknown"} />
          <Metric label="Config" value={`${settings.config_version ?? 0} / ${runtime?.ack_config_version ?? 0}`} />
          <Metric label="Git SHA" value={runtime?.git_sha ? runtime.git_sha.slice(0, 8) : "Unknown"} />
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Last heartbeat</span>
            <p className="font-medium">{formatTime(runtime?.last_heartbeat)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-muted-foreground">Last health check</span>
            <p className="font-medium">{formatTime(runtime?.last_health_check)}</p>
          </div>
        </div>

        {services.length > 0 && (
          <div className="space-y-2">
            <Label>Engine services</Label>
            <div className="flex flex-wrap gap-2">
              {services.map(([name, value]) => (
                <Badge key={name} variant={serviceOnline(value) ? "default" : "outline"} className="capitalize">
                  {name.split("_").join(" ")}: {serviceOnline(value) ? "ready" : "not ready"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {capabilities.length > 0 && (
          <div className="space-y-2">
            <Label>Reported capabilities</Label>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((name) => (
                <Badge key={name} variant="secondary" className="capitalize">{name.split("_").join(" ")}</Badge>
              ))}
            </div>
          </div>
        )}

        {runtime?.last_error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div><strong>Last engine error:</strong> {runtime.last_error}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={Boolean(action)}>
            {action === "refresh" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" onClick={saveConnection} disabled={Boolean(action)}>
            {action === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Connection
          </Button>
          <Button variant="secondary" onClick={() => void runAction("test")} disabled={Boolean(action) || settings.engine_enabled === false}>
            {action === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudCog className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
          <Button onClick={() => void runAction("push")} disabled={Boolean(action) || settings.engine_enabled === false}>
            {action === "push" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Push Configuration
          </Button>
        </div>

        {loading && <p className="text-xs text-muted-foreground">Loading engine runtime status…</p>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold" title={value}>{value}</p>
    </div>
  );
}
