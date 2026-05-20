import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const targets = ["android-kotlin", "ios-swift", "web-react", "python-cli"] as const;
type Target = typeof targets[number];

export default function CodeGenerator() {
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<Target>("android-kotlin");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setCode("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-code", {
        body: { prompt, target }
      }).catch(async () => {
        // fallback to chat-with-ai
        return await supabase.functions.invoke("chat-with-ai", {
          body: { model: "cridergpt-pro", messages: [
            { role: "system", content: `Generate complete, copy-paste-ready starter code for target: ${target}. Output ONLY code in a single fenced block.` },
            { role: "user", content: prompt }
          ]}
        });
      });
      if (error) throw error;
      setCode(data?.code || data?.message || data?.content || JSON.stringify(data));
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <DevHubPage title="App & Site Code Generator" subtitle="Android, iOS, Web, or Python starter projects.">
      <Tabs value={target} onValueChange={(v) => setTarget(v as Target)}>
        <TabsList className="grid grid-cols-4 mb-4">
          {targets.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={target}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Prompt</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={10} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={`Describe the ${target} starter you want...`} />
                <Button onClick={gen} disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating</> : "Generate"}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Output</CardTitle>
                {code && <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}><Copy className="w-4 h-4" /></Button>}
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-[600px] overflow-y-auto min-h-[300px]">{code || "// output"}</pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DevHubPage>
  );
}
