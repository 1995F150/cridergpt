import { useEffect, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Severity = "low" | "med" | "high" | "blocker";
type Status = "open" | "in_progress" | "fixed" | "wontfix";
type Platform = "ios" | "android" | "both";

interface DebugNote {
  id: string;
  platform: Platform;
  screen: string;
  severity: Severity;
  status: Status;
  issue: string;
  fix: string;
  createdAt: string;
}

const STORAGE_KEY = "cridergpt_native_debug_notes_v6";

const SEED: DebugNote[] = [
  {
    id: "seed-1",
    platform: "android",
    screen: "Auth / Sign In",
    severity: "high",
    status: "open",
    issue: "‘Google Sign In Cancelled or Failed’ error persists on screen after dismissing the Google sheet. No retry guidance, no way to clear the message except retyping email.",
    fix: "Clear the error state when the user taps anywhere or starts typing in Email/Password. Add a small ‘Try again’ link below the error. Verify iOS URL scheme + reversed client ID in Info.plist matches the Supabase Google provider.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    platform: "android",
    screen: "Side Drawer / Menu",
    severity: "med",
    status: "open",
    issue: "Drawer doesn’t fully overlay the main content — content underneath bleeds through on the right (AI badge, gear, bell, JE avatar still visible). Drawer also cuts off ‘CriderGPT’ logo text on the left edge.",
    fix: "Set drawer width to ~85% of screen, add a dark scrim (rgba(0,0,0,0.5)) over the rest, and respect safe-area insets so the logo isn’t clipped behind the status bar notch.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-3",
    platform: "android",
    screen: "Payment / Subscription",
    severity: "blocker",
    status: "open",
    issue: "Payment screen shows ‘…ule coming soon…’ — Stripe Checkout is not wired on iOS. Apple will reject if digital subs use Stripe anyway.",
    fix: "Wire StoreKit 2 with products cridergpt_plus_monthly and cridergpt_pro_monthly. Call verify-iap edge function on purchase. Hide Stripe entirely on iOS build (Capacitor.getPlatform() === 'ios').",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-4",
    platform: "android",
    screen: "Livestock / Scan Tag",
    severity: "med",
    status: "open",
    issue: "‘TAP NFC’ button is shown on iPhone, but Web NFC isn’t supported in iOS WebView — tapping it does nothing. Confuses the user.",
    fix: "On iOS, hide the ‘TAP NFC’ button and show the iPhone fallback card (already exists in TagScanner.tsx). Or wire a native Core NFC bridge via a Capacitor plugin and only show the button when the plugin is available.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-5",
    platform: "android",
    screen: "Chat / Welcome",
    severity: "low",
    status: "open",
    issue: "Massive empty vertical gap between the model selector (CriderGPT 5.0) and the ‘Welcome to CriderGPT’ headline. Wastes screen real estate on iPhone.",
    fix: "Use flex-1 + justify-center on the welcome block, or pull the welcome up with mt-8 instead of vertically centering. Pin suggestion chips closer to the input bar.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-6",
    platform: "android",
    screen: "Chat / Send Message",
    severity: "blocker",
    status: "open",
    issue: "After tapping the paperclip and attaching a file, the send button does nothing — chat will not submit. App also threw a system ‘Application Not Responding’ dialog after a few seconds. Whole chat is unusable when an attachment is queued.",
    fix: "Likely the send handler is awaiting an upload promise that never resolves (Supabase Storage upload throwing silently on iOS, or fetch hanging because of missing App Transport Security exception). Add a 15s timeout + try/catch around the upload, surface the error in a toast, and let the user retry. Check Xcode device logs for the exact rejection. Also confirm chat-uploads bucket policy allows authenticated insert.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-7",
    platform: "android",
    screen: "Camera / Gallery Sheet",
    severity: "med",
    status: "open",
    issue: "Bottom sheet (Gallery / Camera) appears but the chat screen behind it stays scrollable and the sheet has no scrim. Tapping outside doesn’t always dismiss it.",
    fix: "Add backdrop with onClick to close, lock body scroll while sheet is open (overflow-hidden on parent), and add iOS safe-area-inset-bottom padding so Camera row isn’t flush against the home indicator.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-8",
    platform: "android",
    screen: "Settings / Dark Mode + Notifications",
    severity: "high",
    status: "open",
    issue: "Dark Mode and Notifications toggles flip visually but don’t actually do anything — they’re placeholders. Notifications never registers a push token, and turning Dark Mode OFF does not switch the app to a light theme (whole app stays dark).",
    fix: "Wire Dark Mode toggle to ThemeContext (setTheme('light'|'dark')) and persist to localStorage + profiles.theme. For Notifications: on enable, call Capacitor PushNotifications.register(), capture token, upsert into push_tokens table; on disable, delete the row. Until both are real, hide the toggles or mark them ‘Coming soon’ so it doesn’t look broken.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-9",
    platform: "android",
    screen: "Receipts",
    severity: "low",
    status: "open",
    issue: "Receipts page is bare — Total Spent $0.00 / This Month $0.00 and ‘No receipts found.’ The yellow + button has no affordance text and probably opens a placeholder.",
    fix: "Either ship the receipt-add flow (photo upload → OCR → category) or hide the tile from the drawer on iOS until it works. Add an empty-state illustration + ‘Tap + to add your first receipt’ helper.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-10",
    platform: "android",
    screen: "Placeholder modules (Timeline, Updates, RDR2 Guide, USB Hub, Sensors, Code Editor)",
    severity: "med",
    status: "open",
    issue: "Six drawer items all open identical ‘Module coming soon…’ empty screens. Looks unfinished and pads the menu with dead links.",
    fix: "Either (a) hide these from the iOS drawer until they ship, or (b) render the real web-app version inside an in-app WebView so they’re not empty. RDR2 Guide and USB Hub already exist on web — wire those first. Add a ‘Beta’ badge for ones that are intentionally stubs.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-11",
    platform: "android",
    screen: "Livestock → Scan tab (scan-tag edge function)",
    severity: "high",
    status: "open",
    issue: "Tapping the big yellow SCAN button with an empty Tag ID input fires the edge function and shows toast: `Scan failed: {\"error\":\"tag_id is required\"}`. Native should never call the function without a tag_id — the button should be disabled or short-circuit with a friendly ‘Enter or tap a tag first’ message.",
    fix: "In the native Scan screen: disable the SCAN button while the input is empty (mirror web TagScanner which already does `disabled={!manualTag.trim()}`). Also trim+validate the CriderGPT-XXXXXX format client-side before invoking the edge function. Replace the raw JSON error toast with a humanized message.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-12",
    platform: "android",
    screen: "Auth → Google Sign-In (Android OAuth client + Web Client ID wiring)",
    severity: "blocker",
    status: "open",
    issue: "Google sign-in keeps failing on the native Android app even though the owner says the Google Cloud side was set up correctly: an Android OAuth client labeled ‘Project GPT Native’ was created with the package name, release SHA-1 for Google Play production signing, and bundle/app setup completed. A Web Client ID was also baked into the native app and added on the backend/Supabase provider side. This points less to ‘owner forgot Android OAuth setup’ and more to a wiring/config mismatch between the native app, Google Cloud, Play App Signing certificate, Supabase provider, and package/deep-link values.",
    fix: "Do not assume the user used the wrong client type. Audit the actual native config: find where the Web Client ID is stored (`requestIdToken(...)`, strings.xml, BuildConfig, google-services.json, or auth config), confirm it exactly matches the Web OAuth client configured in Supabase Google provider, and confirm Google Cloud has a matching Android OAuth client for the exact applicationId/package used by the release build. In Play Console, compare both Upload certificate SHA-1 and App signing certificate SHA-1; Google Sign-In release builds usually need the Play App Signing SHA-1, not just the local upload key. Also verify the release build package (`app.cridergpt.android` vs any old `com.cridergpt.android`) and redirect/deep-link scheme match everywhere. Add native logcat around the sign-in failure to capture the exact status code (ex: DEVELOPER_ERROR 10).",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-13",
    platform: "android",
    screen: "Auth → Google Sign-In still failing after confirmed Web Client ID",
    severity: "blocker",
    status: "open",
    issue: "Owner confirmed the website/Web OAuth Client ID is already present in the Android native code, and the app was updated, but Google sign-in still throws the same failure. This means the next AI/debug pass must stop repeating ‘use the Web Client ID’ as the fix. The Web Client ID requirement appears already satisfied; the remaining failure is likely a release signing, package/applicationId, Supabase authorized-client, redirect/deep-link, Play App Signing SHA-1, or native token-exchange mismatch.",
    fix: "Capture proof before changing anything: add Android logcat around the exact Google sign-in call and Supabase token exchange, then record the specific status/exception (`ApiException` status code such as 10 DEVELOPER_ERROR, 12500 SIGN_IN_FAILED, 12501 canceled, or Supabase Auth error). Verify the AAB/APK actually installed is the newest build and has applicationId `app.cridergpt.android`. Compare `server_client_id`/`requestIdToken` at runtime against the Website Web Client ID configured in Supabase Google provider and Google Cloud. Confirm Google Cloud has Android OAuth clients for the Play App Signing SHA-1 and upload/debug SHA-1 if testing outside Play. If using Supabase `signInWithIdToken`, ensure provider is `google`, ID token `aud` equals the Web Client ID, and Supabase Google provider includes that same Web Client ID under Authorized Client IDs. Do not mark fixed until a release-installed build successfully signs in on device.",
    createdAt: new Date().toISOString(),
  },
];

const sevColor: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground",
  med: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  blocker: "bg-red-500/15 text-red-600 border-red-500/30",
};

const statusColor: Record<Status, string> = {
  open: "bg-red-500/10 text-red-500 border-red-500/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  fixed: "bg-green-500/10 text-green-600 border-green-500/30",
  wontfix: "bg-muted text-muted-foreground",
};

export default function NativeAppDebugNotes() {
  const [notes, setNotes] = useState<DebugNote[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setNotes(JSON.parse(raw)); return; } catch {}
    }
    setNotes(SEED);
  }, []);

  useEffect(() => {
    if (notes.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    setNotes(n => [{
      id: crypto.randomUUID(),
      platform: "android",
      screen: "",
      severity: "med",
      status: "open",
      issue: "",
      fix: "",
      createdAt: new Date().toISOString(),
    }, ...n]);
  };

  const update = (id: string, patch: Partial<DebugNote>) => {
    setNotes(n => n.map(x => x.id === id ? { ...x, ...patch } : x));
  };

  const remove = (id: string) => setNotes(n => n.filter(x => x.id !== id));

  const copyReport = () => {
    const md = [
      "# CriderGPT Native App — Debug Notes",
      `_Generated ${new Date().toLocaleString()}_`,
      "",
      ...notes.map(n => [
        `## [${n.platform.toUpperCase()}] ${n.screen || "(unnamed screen)"} — ${n.severity.toUpperCase()} / ${n.status}`,
        "",
        `**Issue:** ${n.issue || "_n/a_"}`,
        "",
        `**Fix:** ${n.fix || "_n/a_"}`,
        "",
      ].join("\n")),
    ].join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    toast({ title: "Report copied", description: "Markdown debug report on clipboard." });
    setTimeout(() => setCopied(false), 1500);
  };

  const counts = {
    open: notes.filter(n => n.status === "open").length,
    blocker: notes.filter(n => n.severity === "blocker").length,
    fixed: notes.filter(n => n.status === "fixed").length,
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bug className="h-6 w-6 text-primary" /> Native App Debug Notes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track iOS / Android bugs spotted in the live app. Notes save to this device.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{counts.open} open</Badge>
              <Badge className={sevColor.blocker}>{counts.blocker} blocker</Badge>
              <Badge className={statusColor.fixed}>{counts.fixed} fixed</Badge>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex gap-2">
            <Button onClick={addNote}><Plus className="h-4 w-4 mr-1" /> New Note</Button>
            <Button variant="outline" onClick={copyReport}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy Markdown Report
            </Button>
          </div>

          {notes.map(n => (
            <Card key={n.id} className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={n.platform} onValueChange={(v: Platform) => update(n.id, { platform: v })}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={n.screen}
                    onChange={e => update(n.id, { screen: e.target.value })}
                    placeholder="Screen (e.g. Auth, Chat, Livestock)"
                    className="h-8 flex-1 min-w-[160px]"
                  />
                  <Select value={n.severity} onValueChange={(v: Severity) => update(n.id, { severity: v })}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="med">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="blocker">Blocker</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={n.status} onValueChange={(v: Status) => update(n.id, { status: v })}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="wontfix">Won't fix</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Issue</div>
                  <Textarea
                    value={n.issue}
                    onChange={e => update(n.id, { issue: e.target.value })}
                    placeholder="What's broken / wrong on the screen?"
                    rows={3}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Fix / Action</div>
                  <Textarea
                    value={n.fix}
                    onChange={e => update(n.id, { fix: e.target.value })}
                    placeholder="How to fix it (file, component, native bridge, etc.)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {notes.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
              No debug notes yet. Hit "New Note" to log your first one.
            </CardContent></Card>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
