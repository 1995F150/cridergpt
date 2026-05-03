import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePassphrase, type PassphraseAction } from "@/hooks/usePassphrase";
import { Trash2, KeyRound, ShieldCheck } from "lucide-react";

const ACTION_LABELS: Record<PassphraseAction, string> = {
  unlock_dev: "Unlock dev/owner mode",
  switch_mode: "Switch AI personality/mode",
  secret_command: "Trigger a secret command",
  verify_action: "Verify it's really you",
};

export function PassphraseManager() {
  const { list, refresh, create, remove, toggle, verify } = usePassphrase();
  const [label, setLabel] = useState("");
  const [phrase, setPhrase] = useState("");
  const [action, setAction] = useState<PassphraseAction>("unlock_dev");
  const [payload, setPayload] = useState("");
  const [testPhrase, setTestPhrase] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!label.trim() || !phrase.trim()) return;
    let parsedPayload: Record<string, any> = {};
    if (payload.trim()) {
      try { parsedPayload = JSON.parse(payload); } catch { parsedPayload = { value: payload }; }
    }
    const ok = await create(label.trim(), phrase, action, parsedPayload);
    if (ok) { setLabel(""); setPhrase(""); setPayload(""); }
  };

  const handleTest = async () => {
    setTestResult(null);
    const res = await verify(testPhrase);
    if (!res) return;
    setTestResult(res.matched ? `✓ Matched: ${res.label} → ${res.action_type}` : "✗ No match");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Passphrases
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Secret words that unlock dev mode, switch AI personality, run commands, or verify it's really you.
            Stored as a one-way hash — never readable, even by the server.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Owner unlock" />
            </div>
            <div>
              <Label>Action</Label>
              <Select value={action} onValueChange={(v) => setAction(v as PassphraseAction)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Passphrase</Label>
            <Input type="password" value={phrase} onChange={(e) => setPhrase(e.target.value)}
              placeholder="e.g. open sesame jessie" />
            <p className="text-xs text-muted-foreground mt-1">Case-insensitive. Trimmed.</p>
          </div>
          <div>
            <Label>Payload (optional)</Label>
            <Input value={payload} onChange={(e) => setPayload(e.target.value)}
              placeholder='e.g. {"mode":"agi"} or just a string' />
          </div>
          <Button onClick={handleCreate}>Save passphrase</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Test a passphrase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input type="password" value={testPhrase} onChange={(e) => setTestPhrase(e.target.value)} placeholder="say it…" />
          <Button variant="secondary" onClick={handleTest}>Verify</Button>
          {testResult && <p className="text-sm">{testResult}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active passphrases ({list.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {list.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.label}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline">{ACTION_LABELS[p.action_type]}</Badge>
                  {p.last_used_at && <span>used {new Date(p.last_used_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.enabled} onCheckedChange={(v) => toggle(p.id, v)} />
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
