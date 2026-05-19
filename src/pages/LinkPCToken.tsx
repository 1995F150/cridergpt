import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Loader2, KeyRound } from "lucide-react";

export default function LinkPCToken() {
  const [jwt, setJwt] = useState<string>("");
  const [label, setLabel] = useState<string>("My PC");
  const [minting, setMinting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) setJwt(data.session.access_token);
    });
  }, []);

  const mint = async () => {
    setMinting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mint-pc-token", {
        body: { label },
      });
      if (error) throw error;
      if (!data?.token) throw new Error("No token returned");
      setToken(data.token);
      setIngestUrl(data.ingest_url);
      toast.success("Token minted — copy it into the CMD prompt");
    } catch (e: any) {
      toast.error(e.message || "Failed to mint token");
    } finally {
      setMinting(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copied");
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <KeyRound className="h-7 w-7" /> Link Your PC
          </h1>
          <p className="text-muted-foreground mt-1">
            One-way push token. Your PC sends data up to the backend — no inbound tunnel needed.
          </p>
        </header>

        {!jwt ? (
          <Card className="p-6">
            <p>You need to be signed in to mint a token.</p>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">PC label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
            </div>
            <Button onClick={mint} disabled={minting} className="w-full">
              {minting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate PC Token
            </Button>

            {token && (
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium">Your PC Token (shown ONCE)</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={token} readOnly className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ingest URL</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={ingestUrl ?? ""} readOnly className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(ingestUrl ?? "")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono whitespace-pre-wrap">
{`Test from your PC:

curl -X POST "${ingestUrl}" ^
  -H "x-pc-token: ${token}" ^
  -H "Content-Type: application/json" ^
  -d "{\\"event_type\\":\\"hello\\",\\"payload\\":{\\"msg\\":\\"hi\\"}}"`}
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="p-6 space-y-2 text-sm">
          <h2 className="font-semibold">Easiest setup (one CMD):</h2>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Download <code className="bg-muted px-1 rounded">setup-pc-link.cmd</code> from /voice-engine/</li>
            <li>Run it. It'll ask you to paste a token — come back here, hit "Generate", paste it.</li>
            <li>It saves credentials to <code className="bg-muted px-1 rounded">%USERPROFILE%\.cridergpt\pc.env</code></li>
            <li>After that: <code className="bg-muted px-1 rounded">push-event.cmd "log" "anything"</code> sends data up.</li>
          </ol>
        </Card>
      </div>
    </main>
  );
}
