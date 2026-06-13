import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layout, Loader2, Copy, FileCode2 } from "lucide-react";
import { BlueprintSVG } from "@/components/idea/BlueprintSVG";

type Platform = "android-kotlin" | "ios-swift" | "web-react";

const PROMPTS: Record<Platform, (screen: string, notes: string) => string> = {
  "android-kotlin": (screen, notes) => `
You are a senior Android engineer. Produce a UI blueprint for the existing native CriderGPT Android app
(package app.cridergpt.android, Kotlin + Jetpack Compose, Material 3, NavHost already wired).

Screen: ${screen}
Notes / constraints: ${notes || "match existing dark theme + bottom nav"}

CRITICAL RULES:
- The UI ALREADY EXISTS. Do NOT delete app/src/main/, MainActivity, the NavHost, theme, or bottom nav.
- Do NOT scaffold a new project. Only ADD or MODIFY files under app/src/main/java/com/cridergpt/android/ui/.
- Reuse SupabaseClient, existing ViewModels, and Material 3 tokens.

Output as:
## Files to add/modify (exact paths)
- bullet list

## Composable code
\`\`\`kotlin
// full Composable + preview
\`\`\`

## Navigation wiring
- exact NavHost route + how to add it without touching existing routes

## ASCII wireframe
\`\`\`
[ wireframe here ]
\`\`\`
`.trim(),

  "ios-swift": (screen, notes) => `
You are a senior iOS engineer. Produce a UI blueprint for the native CriderGPT iOS app
(SwiftUI, iOS 17+, MainTabView + SupabaseService already exist).

Screen: ${screen}
Notes / constraints: ${notes || "match existing dark theme + tab bar"}

CRITICAL RULES:
- The shell ALREADY EXISTS. Do NOT recreate AppConfig.swift, SupabaseService.swift, MainTabView, theme, or auth.
- Only ADD a new SwiftUI View + ViewModel and wire it into MainTabView or an existing nav stack.

Output as:
## Files to add (exact paths)
## SwiftUI View code
\`\`\`swift
\`\`\`
## ViewModel code (if needed)
\`\`\`swift
\`\`\`
## Wiring (one diff against MainTabView)
## ASCII wireframe
\`\`\`
[ wireframe here ]
\`\`\`
`.trim(),

  "web-react": (screen, notes) => `
You are a senior React engineer. Produce a UI blueprint for the CriderGPT Lovable web app
(React 18 + Vite + Tailwind + shadcn/ui, Supabase client at @/integrations/supabase/client).

Screen: ${screen}
Notes / constraints: ${notes || "use existing shadcn components, semantic tokens from index.css"}

Output as:
## File path
## Component code
\`\`\`tsx
\`\`\`
## Route wiring (added to src/App.tsx)
## ASCII wireframe
\`\`\`
[ wireframe here ]
\`\`\`
`.trim(),
};

const SVG_PROMPT = (screen: string, platform: Platform) => `
Return ONLY a valid <svg> wireframe (no <script>, no event handlers, no markdown fences) for the following ${platform} screen.
viewBox="0 0 360 720", monochrome strokes on white, rounded rects for components, label key regions with <text>.
Screen: ${screen}
Output the raw <svg>...</svg> only.
`.trim();

export default function UIBlueprints() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform>("android-kotlin");
  const [screen, setScreen] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgLoading, setSvgLoading] = useState(false);
  const [result, setResult] = useState("");
  const [svg, setSvg] = useState("");

  const ask = async (prompt: string) => {
    const { data, error } = await supabase.functions.invoke("chat-with-ai", {
      body: { message: prompt, model: "cridergpt-5.0" },
    });
    if (error) throw new Error(error.message || "Edge function failed");
    if (data?.error && !data?.response) throw new Error(data.error);
    return data?.response as string;
  };

  const generate = async () => {
    if (!screen.trim()) {
      toast({ title: "Name the screen", description: "e.g. 'Livestock detail with NFC scan button'", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const text = await ask(PROMPTS[platform](screen, notes));
      setResult(text || "");
    } catch (e: any) {
      toast({ title: "Blueprint failed", description: (e?.message || "Unknown").slice(0, 220), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateSvg = async () => {
    if (!screen.trim()) return;
    setSvgLoading(true);
    setSvg("");
    try {
      const text = await ask(SVG_PROMPT(screen, platform));
      const match = text?.match(/<svg[\s\S]*<\/svg>/i);
      setSvg(match ? match[0] : (text || ""));
    } catch (e: any) {
      toast({ title: "SVG failed", description: (e?.message || "Unknown").slice(0, 220), variant: "destructive" });
    } finally {
      setSvgLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast({ title: "Copied", description: "Blueprint copied." });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <Helmet>
          <title>UI Blueprints — Dev Hub</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-6 w-6 text-primary" />
                UI Blueprints
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate a screen blueprint the Android Studio / Xcode / Lovable agent can implement without deleting your existing UI.
                Picks ADD-ONLY paths so Gemini stops trying to wipe <code>app/src/main</code>.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Platform</label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android-kotlin">Android (Kotlin + Compose)</SelectItem>
                      <SelectItem value="ios-swift">iOS (SwiftUI)</SelectItem>
                      <SelectItem value="web-react">Web (React + shadcn)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Screen name</label>
                  <Input value={screen} onChange={(e) => setScreen(e.target.value)} placeholder="Livestock detail with NFC scan button" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Notes / constraints (optional)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Keep bottom nav. Add a sticky 'Scan NFC' FAB. Pull data from livestock_animals." />
              </div>

              <div className="flex gap-2">
                <Button onClick={generate} disabled={loading} className="flex-1">
                  {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>) : (<><FileCode2 className="h-4 w-4 mr-2" /> Generate blueprint</>)}
                </Button>
                <Button onClick={generateSvg} disabled={svgLoading} variant="outline">
                  {svgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Wireframe SVG"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {svg && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Wireframe</CardTitle></CardHeader>
              <CardContent><BlueprintSVG svg={svg} /></CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Blueprint</CardTitle>
                <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{result}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
