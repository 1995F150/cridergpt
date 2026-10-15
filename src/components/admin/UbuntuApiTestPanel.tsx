import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Result = {
  ok?: boolean;
  action?: string;
  upstream_status?: number;
  elapsed_ms?: number;
  data?: any;
  error?: string;
};

function pickModel(r: Result): string | null {
  const d = r.data;
  if (!d || typeof d !== "object") return null;
  if (typeof d.model === "string") return d.model;
  if (typeof d.model_id === "string") return d.model_id;
  if (Array.isArray(d.data)) return d.data.map((m: any) => m?.id ?? m).join(", ");
  if (Array.isArray(d.models)) return d.models.map((m: any) => m?.id ?? m).join(", ");
  return null;
}

function pickReply(r: Result): string | null {
  const d = r.data;
  if (typeof d === "string") return d;
  if (!d || typeof d !== "object") return null;
  return d.response ?? d.reply ?? d.message ?? d.text ?? d.output ?? null;
}

export function UbuntuApiTestPanel() {
  const [model, setModel] = useState("andromeda-3.0-360m-100");
  const [message, setMessage] = useState("What is 2 + 2?");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async (action: "health" | "models" | "chat") => {
    setBusy(action);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("cridergpt-ubuntu-api", {
      body: action === "chat" ? { action, model, message } : { action },
    });
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* ignore */ }
      setResult({ ok: false, action, error: msg });
    } else {
      setResult(data as Result);
    }
    setBusy(null);
  };

  const modelId = result ? pickModel(result) : null;
  const reply = result ? pickReply(result) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubuntu API test (api.cridergpt.com)</CardTitle>
        <CardDescription>
          Admin-only. Runs through the server; your API key is never sent to the browser. Live chat is not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model ID" />
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!busy} onClick={() => run("health")}>
            {busy === "health" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Health
          </Button>
          <Button variant="outline" disabled={!!busy} onClick={() => run("models")}>
            {busy === "models" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}List models
          </Button>
          <Button disabled={!!busy} onClick={() => run("chat")}>
            {busy === "chat" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test chat
          </Button>
        </div>
        {busy === "chat" && (
          <p className="text-sm text-muted-foreground">CPU inference can take up to 90 seconds…</p>
        )}
        {result && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.ok ? "default" : "destructive"}>
                HTTP {result.upstream_status ?? "—"}
              </Badge>
              {result.elapsed_ms != null && (
                <span className="text-muted-foreground">{(result.elapsed_ms / 1000).toFixed(1)}s</span>
              )}
            </div>
            {result.error && <p className="text-destructive">{result.error}</p>}
            {modelId && <p><span className="font-medium">Model:</span> {modelId}</p>}
            {reply && <p className="whitespace-pre-wrap"><span className="font-medium">Response:</span> {reply}</p>}
            {result.data != null && (
              <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
