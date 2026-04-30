import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Trash2, Copy, Plus } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `cgpt_live_${hex}`;
}

export function PublicApiKeysPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cridergpt_public_api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    const newKey = genKey();
    const hash = await sha256Hex(newKey);
    const prefix = newKey.slice(0, 16) + "…";
    const { error } = await supabase.from("cridergpt_public_api_keys").insert({
      user_id: user.id,
      name: name.trim(),
      key_hash: hash,
      key_prefix: prefix,
      scopes: ["chat"],
      rate_limit_per_min: 30,
      is_active: true,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setJustCreated(newKey);
    setName("");
    load();
    toast({ title: "API key created", description: "Copy it now — you won't see it again." });
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("cridergpt_public_api_keys").delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k);
    toast({ title: "Copied" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" /> Public API Keys
        </CardTitle>
        <CardDescription>
          Generate keys so external sites/apps can call CriderGPT. Endpoint:{" "}
          <code className="text-xs">/functions/v1/cridergpt-public-api</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Key name (e.g. my-website)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create} disabled={creating || !name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>

        {justCreated && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              ⚠️ Copy this key now — it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded border break-all">{justCreated}</code>
              <Button size="sm" variant="outline" onClick={() => copyKey(justCreated)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>I've saved it</Button>
          </div>
        )}

        <div className="space-y-2">
          {keys.length === 0 && <p className="text-xs text-muted-foreground">No keys yet.</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{k.name}</span>
                  <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "active" : "revoked"}</Badge>
                  <Badge variant="outline">{k.rate_limit_per_min}/min</Badge>
                </div>
                <code className="text-xs text-muted-foreground">{k.key_prefix}</code>
                <p className="text-[10px] text-muted-foreground">
                  Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer font-medium">📘 How to use from another site</summary>
          <pre className="mt-2 p-3 bg-muted rounded overflow-x-auto text-[11px]">{`fetch("https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/cridergpt-public-api", {
  method: "POST",
  headers: {
    "Authorization": "Bearer cgpt_live_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "hey what's up",
    conversation: [] // optional last 10 turns
  })
}).then(r => r.json()).then(console.log)`}</pre>
        </details>
      </CardContent>
    </Card>
  );
}
