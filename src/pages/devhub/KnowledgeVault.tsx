import { useEffect, useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookLock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface VaultEntry { id: string; title: string; body: string; tag: string; createdAt: number; }
const KEY = "cridergpt-vault-v1";

export default function KnowledgeVault() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("family");

  useEffect(() => {
    try { setEntries(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);

  const save = (next: VaultEntry[]) => {
    setEntries(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!title.trim() || !body.trim()) return;
    const next = [{ id: crypto.randomUUID(), title, body, tag, createdAt: Date.now() }, ...entries];
    save(next); setTitle(""); setBody("");
    toast.success("Stored in vault");
  };

  const del = (id: string) => save(entries.filter(e => e.id !== id));

  return (
    <DevHubPage title="Knowledge Vault" subtitle="Private notes CriderGPT can pull into chat context (owner-only, stored locally for now)">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookLock className="w-4 h-4" /> New Entry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title (e.g. Mom's dad — oil field)" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="tag: family / contact / history / business" value={tag} onChange={e => setTag(e.target.value)} />
            <Textarea rows={8} placeholder="Full note body..." value={body} onChange={e => setBody(e.target.value)} />
            <Button onClick={add} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add to Vault</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Entries ({entries.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Empty vault.</p>}
            {entries.map(e => (
              <div key={e.id} className="border border-border rounded p-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">{e.tag} · {new Date(e.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{e.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
