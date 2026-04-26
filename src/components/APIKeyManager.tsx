import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Key, Copy, Trash2, RefreshCw, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiKeyRecord {
  id: string;
  label: string | null;
  permissions: any;
  active: boolean;
  rate_limit_per_minute: number;
  created_at: string;
  revoked_at: string | null;
}

interface ApiLog {
  id: string;
  user_email: string | null;
  endpoint: string | null;
  command: string | null;
  status: string | null;
  created_at: string | null;
}

export function APIKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [killSwitch, setKillSwitch] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [rateLimit, setRateLimit] = useState(60);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState<string | null>(null);

  const callAdmin = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("cridergpt-admin", {
      body: { action, ...extra },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [keysRes, logsRes, settingsRes] = await Promise.all([
        callAdmin("list_keys"),
        callAdmin("list_logs"),
        callAdmin("get_settings"),
      ]);
      setKeys(keysRes.keys || []);
      setLogs((logsRes.logs || []).slice(0, 50));
      setKillSwitch(!!settingsRes?.settings?.kill_switch);
    } catch (e: any) {
      toast.error(e.message || "Failed to load API data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleGenerate = async () => {
    if (!newKeyLabel.trim()) {
      toast.error("Give the key a label first");
      return;
    }
    setGenerating(true);
    try {
      const data = await callAdmin("generate_key", {
        label: newKeyLabel.trim(),
        rate_limit_per_minute: rateLimit,
      });
      setJustGenerated(data.key);
      setNewKeyLabel("");
      toast.success("Key generated — copy it now, it won't be shown again");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? It cannot be undone.")) return;
    try {
      await callAdmin("revoke_key", { id });
      toast.success("Key revoked");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to revoke");
    }
  };

  const handleKillSwitch = async (kill: boolean) => {
    setKillSwitch(kill);
    try {
      await callAdmin("set_kill_switch", { kill });
      toast.success(kill ? "API DISABLED" : "API enabled");
    } catch (e: any) {
      setKillSwitch(!kill);
      toast.error(e.message || "Failed to update kill switch");
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const statusBadge = (k: ApiKeyRecord) => {
    if (!k.active || k.revoked_at) return <Badge variant="destructive">Revoked</Badge>;
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Kill switch + refresh */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-3">
            {killSwitch ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            )}
            <div>
              <Label htmlFor="kill" className="text-base font-semibold">
                API Kill Switch
              </Label>
              <p className="text-xs text-muted-foreground">
                {killSwitch ? "All API calls blocked" : "API is live and accepting requests"}
              </p>
            </div>
            <Switch id="kill" checked={killSwitch} onCheckedChange={handleKillSwitch} />
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </CardContent>
      </Card>

      {/* Generate new key */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-cyber-blue" />
            <span className="text-cyber-blue">Generate New API Key</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
            <Input
              placeholder="Key label (e.g. 'iPhone shortcuts')"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              disabled={generating}
            />
            <Input
              type="number"
              min={1}
              max={1000}
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value) || 60)}
              disabled={generating}
              placeholder="Req/min"
            />
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>

          {justGenerated && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
              <p className="text-sm font-semibold text-green-400">
                ⚠️ Copy this key now — it won't be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background/50 px-3 py-2 rounded text-xs font-mono break-all">
                  {justGenerated}
                </code>
                <Button size="sm" variant="outline" onClick={() => copy(justGenerated)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setJustGenerated(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active keys */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Existing Keys ({keys.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.length === 0 && (
            <p className="text-sm text-muted-foreground">No keys yet. Generate one above.</p>
          )}
          {keys.map((k) => (
            <div
              key={k.id}
              className="p-4 rounded-lg bg-secondary/30 border border-border flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold truncate">{k.label || "(unlabeled)"}</span>
                  {statusBadge(k)}
                </div>
                <p className="text-xs text-muted-foreground">
                  ID: <code className="font-mono">{k.id.slice(0, 8)}…</code> · Limit:{" "}
                  {k.rate_limit_per_minute}/min · Created{" "}
                  {new Date(k.created_at).toLocaleDateString()}
                </p>
              </div>
              {k.active && !k.revoked_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(k.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent logs */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Recent API Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-secondary/20 border border-border/50 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-cyber-blue truncate">
                        {log.endpoint || "?"}
                      </span>
                      <Badge
                        variant={log.status === "ok" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {log.status || "unknown"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground truncate">
                      {log.user_email} · {log.command?.slice(0, 100) || "(no command)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
