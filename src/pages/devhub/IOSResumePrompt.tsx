import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Copy, Apple, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Default status mirrors the screenshot Jessie sent (Gemini's own report).
// Editable in the UI so he can bump numbers as Gemini finishes work.
type PhaseKey = "auth" | "shell" | "data" | "features" | "iap";

const DEFAULT_STATUS: Record<PhaseKey, number> = {
  auth: 90,
  shell: 100,
  data: 70,
  features: 30,
  iap: 0,
};

const PHASE_LABELS: Record<PhaseKey, string> = {
  auth: "Authentication",
  shell: "Core Shell / Nav",
  data: "Data Layer (Supabase)",
  features: "Feature Modules",
  iap: "Subscription (IAP / StoreKit 2)",
};

const DEFAULT_DONE = `- AppConfig.swift contains SUPABASE_URL + SUPABASE_ANON_KEY (do NOT rewrite — it is already correct)
- SupabaseService.swift wired (auth, postgrest, storage helpers exist — do NOT regenerate)
- MainTabView / NavigationStack scaffolded
- Sign in with Apple flow returns a Supabase session
- Profile fetch + sign-out work end to end
- Theme + dark mode tokens defined`;

const DEFAULT_REMAINING = `1. Receipts module: implement the "Add Receipt" flow (photo pick, OCR optional, upload to Supabase storage 'receipts' bucket, insert row into public.receipts). The list view already exists.
2. Dashboard placeholders: replace BlueprintGenerator, SwiftGenerator, BusinessCalculator, and any GenericBackendView stubs with real SwiftUI screens that match the web behavior.
3. Knowledge Vault + ServerAIConsole: build native SwiftUI views that read/write the same Supabase tables the web uses.
4. Subscription (StoreKit 2): products app.cridergpt.android.plus_monthly and .pro_monthly. Paywall sheet, restore purchases, call existing verify-iap edge function.
5. File Management polish: upload progress, error toasts, retry on failure.`;

function buildPrompt(opts: {
  status: Record<PhaseKey, number>;
  done: string;
  remaining: string;
  repo: string;
  branch: string;
}) {
  const { status, done, remaining, repo, branch } = opts;
  const statusLines = (Object.keys(PHASE_LABELS) as PhaseKey[])
    .map((k) => `- ${PHASE_LABELS[k]}: ${status[k]}%`)
    .join("\n");
  return `You are continuing an EXISTING native iOS migration of the CriderGPT web app. The Xcode project already lives at ${repo} on branch ${branch}. Your job is to FINISH the remaining work — NOT to restart, re-scaffold, or re-write what is already done.

=== STOP CONDITIONS — READ BEFORE TYPING ANY CODE ===
1. DO NOT regenerate AppConfig.swift. The Supabase URL and anon key are already correct in that file. If you open it, only READ it. If you think it needs updating, STOP and ask Jessie first.
2. DO NOT re-create SupabaseService.swift, the auth flow, the tab bar, the navigation graph, or the theme. They already exist and work.
3. DO NOT re-run any "set up Supabase", "add Supabase SDK", or "configure Sign in with Apple" step. They are done.
4. DO NOT add Capacitor, React Native, Flutter, or any web wrapper. This is a NATIVE Swift 5.9 + SwiftUI app (iOS 16+).
5. DO NOT change package/bundle id, signing config, or Info.plist privacy strings without explicit instruction.
6. If a step you are about to take overlaps with anything in the "Already done" list below, SKIP it and move on.

=== CURRENT PHASE STATUS (per Gemini's last audit) ===
${statusLines}

=== ALREADY DONE — DO NOT REDO ===
${done}

=== WHAT IS ACTUALLY LEFT, IN PRIORITY ORDER ===
${remaining}

=== HOW TO WORK ===
- Work on ONE numbered item at a time. Finish it completely, commit, then move to the next.
- For each item, output: (a) the file paths you will change, (b) the full new file contents, (c) one short commit message.
- Use the existing SupabaseService helpers — do not introduce a second Supabase client.
- Match the web app's table names exactly (public.receipts, public.knowledge_vault, etc.). Do not invent new schemas.
- StoreKit 2 only for digital subscriptions. Never call Stripe from the iOS app.
- Verify every purchase server-side by POSTing the JWS to the existing verify-iap Supabase edge function.
- SwiftUI HIG: SF Symbols, system fonts, Dynamic Type, dark mode, VoiceOver labels on every interactive control.
- No TODO comments, no placeholder views, no "we will implement this later". If you cannot finish an item in this turn, stop at a clean checkpoint and tell Jessie which sub-step is next.

=== ANTI-LOOP GUARD ===
Before you start, repeat back to Jessie in 3 bullet points: (1) the single item you are about to work on, (2) the files you will touch, (3) what "done" looks like for that item. Wait for him to say "go" before writing code. This prevents the loop where you keep re-updating AppConfig.swift.

Start now by repeating back the 3 bullets for item #1 from the remaining list.`;
}

export default function IOSResumePrompt() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Record<PhaseKey, number>>(DEFAULT_STATUS);
  const [done, setDone] = useState(DEFAULT_DONE);
  const [remaining, setRemaining] = useState(DEFAULT_REMAINING);
  const [repo, setRepo] = useState("https://github.com/1995F150/cridergpt-ios");
  const [branch, setBranch] = useState("main");

  const prompt = useMemo(
    () => buildPrompt({ status, done, remaining, repo, branch }),
    [status, done, remaining, repo, branch],
  );

  const overall = useMemo(() => {
    const vals = Object.values(status);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [status]);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast({ title: "Copied", description: "Paste into Gemini / Cursor / Claude Code" });
  };

  const reset = () => {
    setStatus(DEFAULT_STATUS);
    setDone(DEFAULT_DONE);
    setRemaining(DEFAULT_REMAINING);
    toast({ title: "Reset", description: "Restored defaults from the last Gemini audit" });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Apple className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">iOS Migration Resume Prompt</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Stop Gemini from re-doing finished work. Pin current % per phase, list what's done, list what's left, copy a strict resume prompt.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Overall progress: {overall}%</CardTitle>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset to last audit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={overall} />
              {(Object.keys(PHASE_LABELS) as PhaseKey[]).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_auto_5rem] items-center gap-2">
                  <Label className="text-xs">{PHASE_LABELS[k]}</Label>
                  <Progress value={status[k]} className="w-32" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={status[k]}
                    onChange={(e) =>
                      setStatus((s) => ({ ...s, [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
                    }
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Repo</CardTitle></CardHeader>
              <CardContent>
                <Input value={repo} onChange={(e) => setRepo(e.target.value)} className="text-xs font-mono" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Branch</CardTitle></CardHeader>
              <CardContent>
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="text-xs font-mono" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Already done <Badge variant="secondary" className="text-[10px]">do NOT redo</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={8} value={done} onChange={(e) => setDone(e.target.value)} className="font-mono text-xs" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                What's actually left <Badge variant="outline" className="text-[10px]">priority order</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={10} value={remaining} onChange={(e) => setRemaining(e.target.value)} className="font-mono text-xs" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Final prompt for Gemini / Cursor / Claude Code</CardTitle>
              <Button size="sm" onClick={copy}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy prompt
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea readOnly value={prompt} className="font-mono text-xs h-96" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
