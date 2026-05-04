import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePassphrase } from "@/hooks/usePassphrase";
import { Lock, Unlock, ShieldCheck, ShieldAlert, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const SESSION_KEY = "cridergpt:dev_unlocked";
const DEFAULT_LABEL = "Owner unlock (test)";
const DEFAULT_PHRASE = "CriderGPT2025!";

type LogEntry = { ts: string; kind: "ok" | "fail" | "info"; msg: string };

export function PassphraseTestFlow() {
  const { list, refresh, create, verify } = usePassphrase();
  const [phrase, setPhrase] = useState("");
  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );
  const [log, setLog] = useState<LogEntry[]>([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-seed the default test passphrase if it doesn't exist yet.
  useEffect(() => {
    if (seeding) return;
    if (!list.length) return;
    const exists = list.some((p) => p.label === DEFAULT_LABEL);
    if (!exists) void seedDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const append = (kind: LogEntry["kind"], msg: string) =>
    setLog((l) => [{ ts: new Date().toLocaleTimeString(), kind, msg }, ...l].slice(0, 20));

  const seedDefault = async () => {
    setSeeding(true);
    const ok = await create(DEFAULT_LABEL, DEFAULT_PHRASE, "unlock_dev", { source: "test_flow" });
    setSeeding(false);
    if (ok) append("info", `Seeded default passphrase "${DEFAULT_LABEL}"`);
  };

  const handleVerify = async () => {
    if (!phrase.trim()) {
      toast.error("Type a passphrase first");
      return;
    }
    const res = await verify(phrase);
    if (!res) { append("fail", "Verify call failed"); return; }
    if (res.matched && res.action_type === "unlock_dev") {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      append("ok", `Unlocked via "${res.label}"`);
      toast.success("Dev mode unlocked");
    } else if (res.matched) {
      append("info", `Matched but action is "${res.action_type}", not unlock_dev`);
      toast.message(`Matched action: ${res.action_type}`);
    } else {
      append("fail", "No match — dev mode stays locked");
      toast.error("Wrong passphrase");
    }
    setPhrase("");
  };

  const handleLock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    append("info", "Locked dev mode");
  };

  const tryProtectedCommand = () => {
    if (!unlocked) {
      append("fail", "Blocked: dev mode is locked");
      toast.error("Blocked — unlock first");
      return;
    }
    append("ok", "Ran protected command: ping_owner_tools()");
    toast.success("Protected command executed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" /> Passphrase Test Flow
          <Badge variant={unlocked ? "default" : "secondary"} className="ml-auto">
            {unlocked ? <><Unlock className="h-3 w-3 mr-1" /> Dev unlocked</>
                     : <><Lock className="h-3 w-3 mr-1" /> Dev locked</>}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            Default test passphrase: <code className="font-mono">{DEFAULT_PHRASE}</code>
            {" "}— bound to action <code>unlock_dev</code>. Auto-seeded on first load.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Enter passphrase</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="say it…"
            />
            <Button onClick={handleVerify}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Verify
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <Button variant="secondary" onClick={tryProtectedCommand}>
            <ShieldAlert className="h-4 w-4 mr-1" /> Run protected command
          </Button>
          <Button variant="outline" onClick={handleLock} disabled={!unlocked}>
            <Lock className="h-4 w-4 mr-1" /> Lock dev mode
          </Button>
        </div>

        {!list.some((p) => p.label === DEFAULT_LABEL) && (
          <Button variant="ghost" size="sm" onClick={seedDefault} disabled={seeding}>
            Re-seed default passphrase
          </Button>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Test log</Label>
          <div className="mt-1 border rounded p-2 max-h-48 overflow-y-auto text-xs space-y-1 font-mono">
            {log.length === 0 && <div className="text-muted-foreground">No events yet.</div>}
            {log.map((e, i) => (
              <div key={i} className={
                e.kind === "ok" ? "text-green-600"
                : e.kind === "fail" ? "text-destructive"
                : "text-muted-foreground"
              }>
                [{e.ts}] {e.msg}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
