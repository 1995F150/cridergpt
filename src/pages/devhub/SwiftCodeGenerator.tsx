import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";

const EXAMPLES = [
  "A screen that lists livestock animals from Supabase with NFC scan button",
  "Login screen using Sign in with Apple + Google",
  "Camera + photo picker that uploads to Supabase storage",
  "Settings screen with toggle for biometric unlock",
];

export default function SwiftCodeGenerator() {
  const [prompt, setPrompt] = useState("");
  const [kotlin, setKotlin] = useState("");
  const [swift, setSwift] = useState("");
  const [busy, setBusy] = useState(false);

  const gen = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setKotlin(""); setSwift("");
    try {
      const [k, s] = await Promise.all([
        supabase.functions.invoke("generate-code", {
          body: { prompt: `Write Kotlin + Jetpack Compose code for Android (single file, production-ready):\n\n${prompt}` },
        }),
        supabase.functions.invoke("generate-code", {
          body: { prompt: `Write Swift + SwiftUI code for iOS 17+ (single file, production-ready, follows Apple HIG):\n\n${prompt}` },
        }),
      ]);
      if (k.error) throw k.error;
      if (s.error) throw s.error;
      setKotlin((k.data as any)?.reply || "");
      setSwift((s.data as any)?.reply || "");
      toast.success("Generated both platforms");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  };

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <DevHubPage title="Swift Code Generator" subtitle="Unified cross-platform: Kotlin + Swift side-by-side">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />Describe the screen / feature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A screen that shows my livestock and lets me scan an NFC tag…" />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(x => (
                <Button key={x} variant="outline" size="sm" className="text-xs h-auto py-1" onClick={() => setPrompt(x)}>{x}</Button>
              ))}
            </div>
            <Button onClick={gen} disabled={busy || !prompt.trim()}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Code2 className="w-4 h-4 mr-2" />}
              Generate for both platforms
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Badge>Android</Badge> Kotlin · Jetpack Compose</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("Kotlin", kotlin)} disabled={!kotlin}><Copy className="w-3 h-3" /></Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={kotlin} className="font-mono text-xs h-[480px]" placeholder="Kotlin output will appear here…" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Badge variant="secondary">iOS</Badge> Swift · SwiftUI</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("Swift", swift)} disabled={!swift}><Copy className="w-3 h-3" /></Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={swift} className="font-mono text-xs h-[480px]" placeholder="Swift output will appear here…" /></CardContent>
          </Card>
        </div>
      </div>
    </DevHubPage>
  );
}
