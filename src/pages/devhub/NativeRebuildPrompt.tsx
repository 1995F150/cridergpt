import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Download, Rocket } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

const FEATURE_GROUPS: { name: string; items: string[] }[] = [
  {
    name: "Core Chat & AI",
    items: [
      "Multi-turn chat with conversation history (chat_conversations + chat_messages)",
      "Multi-modal input: text, image upload, camera capture, file upload, speech-to-text",
      "Local-first AI: query ai_memory + cridergpt_training_corpus first, fall back to OpenAI then Lovable AI Gateway",
      "Jessie Crider Southern Gen Z FFA Historian persona (0% AI detection tone)",
      "Conversation continuity & implicit reference resolution across turns",
      "AGI Mode autonomous reasoning loop with tool-calling",
      "Multi-purpose 150-agent parallel swarm (agent_swarm_sessions + agent_swarm_tasks)",
      "ChatGPT JSON conversation import (conversation_imports)",
      "Public demo: 5 free guest messages then conversion funnel (demo_usage)",
      "Sensor & environmental context injected into prompts",
      "Vision memory + character reference library for multi-character image gen",
    ],
  },
  {
    name: "Media Generation",
    items: [
      "AI image generation with EXIF/XMP stripped for privacy",
      "Multi-character generation w/ character_references + user_reference_library",
      "Music generation via self-hosted MusicGen proxy (music_tracks)",
      "Voice / TTS via self-hosted XTTS-v2 (voice_profiles)",
      "File generator: PDF (with CriderGPT branded watermark), CSV, TXT, DOCX",
      "FS25 / FS22 mod ZIP unpack, XML edit, repack signed",
    ],
  },
  {
    name: "Livestock System (strict scan-only)",
    items: [
      "Plain-text CriderGPT-XXXXXX NFC tag format (NEVER change this)",
      "Tag pool + auto-generation (livestock_tag_pool, livestock_tags)",
      "Scan-to-register workflow only — never type IDs manually",
      "NFC write: default plain-text, never hardware-lock by default",
      "iOS fallback: manual entry UI when Web NFC missing",
      "Raspberry Pi edge scanner integration (livestock_devices, livestock_device_logs)",
      "Animals, health records, weights, production, notes, transfers, access sharing",
    ],
  },
  {
    name: "FFA Chapter System",
    items: [
      "Multi-chapter platform (chapters, chapter_officers, chapter_requests)",
      "Two-tier event visibility: Personal vs Chapter (events)",
      "Chapter activity feed + awards",
      "User FFA profiles linked to chapters",
    ],
  },
  {
    name: "Store / Retail",
    items: [
      "Physical goods store_products w/ 10-unit minimum reserve constraint",
      "Cart > stock triggers lead-time fulfillment calculation",
      "Stripe-only checkout for physical/web goods; paid status set ONLY by Stripe webhook",
      "Checkout UX: identity fields separated from shipping fields (autofill fix)",
      "Verified reviews (store_reviews) + order lifecycle (store_orders, store_purchases)",
      "Default $3.50 Smart Tag pricing",
    ],
  },
  {
    name: "Monetization",
    items: [
      "Plans: Free / Plus / Pro (plan_configurations)",
      "Stripe subscriptions for web (subscriptions, user_subscriptions)",
      "Native IAP for mobile digital goods (iap_purchases, platform_subscriptions)",
      "NEVER use Stripe for mobile digital goods (Apple/Google policy)",
      "AdMob rewarded video (+5 messages), interstitial (every 10th open), and banner (demo page) for free-tier Android/iOS ONLY. Paid users see zero ads.",
      "Usage controls, tier upgrade logs, feature throttles",
      "Referral codes + referrals tracking",
    ],
  },
  {
    name: "Integrations",
    items: [
      "Snapchat Snap Kit OAuth + Bitmoji + custom AR Lens pricing engine w/ BOGO",
      "TikTok Content Posting API for direct video uploads (tiktok_tokens)",
      "OAuth providers: Google (popup/one-tap, NO full-page redirects), GitHub, X/Twitter, Spotify",
      "USB / Serial hardware data hub (usb_data_logs) with mobile fallback",
      "Self-hosted Docker stack: 4 containers on AMD Ryzen CPU-only",
      "Self-hosted Android builder: Ubuntu auto-builds signed APK+AAB on web push",
    ],
  },
  {
    name: "Dev Hub & Owner Tools",
    items: [
      "Owner identity verification via RPC — Jessie Crider only",
      "Developer code editor (restricted)",
      "Server console + health + self-repair (pc_events, pc_outbox, server_commands)",
      "Knowledge vault (private notes, Harman family lineage)",
      "Autopilot queue + agent dispatcher + machine designer",
      "Laser engraver studio (SVG/PNG → G-code)",
      "Welding job tracker + income calculator + money split",
    ],
  },
  {
    name: "Auth & Privacy (HARD RULES)",
    items: [
      "Supabase Auth — Google popup/one-tap ONLY, never full-page redirect",
      "Strict RLS on every table — user data scoped to auth.uid()",
      "NEVER sell user data or cookies",
      "DO NOT assist in bypassing school filters like GoGuardian",
      "Roles in separate user_roles table (NEVER on profile) + has_role() SECURITY DEFINER",
      "Owner passphrases + dev panel restricted by RPC",
    ],
  },
];

const PLATFORM_BLOCKS = {
  android: `### 📱 ANDROID (Native — Kotlin + Jetpack Compose)

**Stack:** Kotlin 2.0, Jetpack Compose, Material 3, Hilt, Coroutines + Flow, Room (offline cache), Retrofit + OkHttp (Supabase REST), ktor-client for Edge Functions, CameraX, ML Kit (text/barcode), NFC HCE + Reader, DataStore for prefs, WorkManager for background sync.

**Project:** \`com.cridergpt.app\` · minSdk 26 · targetSdk 34 · Compose BOM 2024.09.

**Architecture:** MVI / Clean — \`:app\` + \`:core-data\` + \`:core-ui\` + \`:feature-chat\` + \`:feature-livestock\` + \`:feature-store\` + \`:feature-devhub\`. ViewModel per screen, Repository per table, sealed UiState.

**Supabase wiring:**
- Add gradle: \`io.github.jan-tennert.supabase:postgrest-kt\`, \`gotrue-kt\`, \`realtime-kt\`, \`storage-kt\`, \`functions-kt\` (latest).
- \`SupabaseClient\` singleton injected via Hilt with URL + anon key (below).
- Google Sign-In: \`@capacitor/browser\`-style Custom Tabs flow — NO Firebase, NO SHA-1 required. Deep link \`app.cridergpt.android://oauth-callback\`.

**NFC:** \`NfcAdapter\` foreground dispatch, write plain-text \`CriderGPT-XXXXXX\` via NDEF text record. NEVER lock the tag.

**Native bits:** VoiceInteractionService for "Hey Crider", CameraX preview → ML Kit, USB Host API for serial.

**Builder:** Self-hosted Ubuntu runner on AMD Ryzen — \`./gradlew bundleRelease assembleRelease\` signed w/ keystore on every web push.

**AdMob (free-tier only):**
- Gradle: \`com.google.android.gms:play-services-ads:23.+\`
- Manifest \`<application>\`: \`<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-1884621321896668~7174244598"/>\`
- Unit IDs (production): Rewarded \`ca-app-pub-1884621321896668/8461902383\`, Interstitial \`ca-app-pub-1884621321896668/6979140189\`, Banner \`ca-app-pub-1884621321896668/5478019545\`.
- Gate every ad load behind the user's plan: query \`user_subscriptions\` / \`plan_configurations\`. If plan is Plus/Pro/Lifetime → skip load/show entirely.
- Surfaces: Rewarded button "Watch ad for +5 messages" (message cap hit). Interstitial every 10th cold open. Banner on public/demo pages.
- Use Google's test ad unit IDs during development. NEVER click your own ads.

**DO NOT modify the externally managed \`android/\` folder if it exists. Generate a fresh \`android-native/\` tree instead.**
`,
  ios: `### 🍎 iOS (Native — Swift + SwiftUI)

**Stack:** Swift 5.10, SwiftUI, Combine, Swift Concurrency (async/await), SwiftData (offline cache), URLSession (Supabase REST), AVFoundation + Vision (camera/OCR), Core NFC (NDEF read/write), UserDefaults + Keychain, BackgroundTasks.

**Project:** Bundle ID \`com.cridergpt.app\` · iOS 16+ · Xcode 15.

**Architecture:** MV (SwiftUI native) — \`@Observable\` view models, \`Repository\` actors per table, \`Result<Success, AppError>\` everywhere.

**Supabase:** \`supabase-swift\` SPM package. Single \`SupabaseManager\` actor with the URL + anon key (below). Realtime via the official client.

**Google Sign-In:** Use \`ASWebAuthenticationSession\` (popup) — NO GoogleSignIn SDK, NO Firebase. Universal Link callback \`cridergpt://oauth-callback\`.

**NFC:** \`NFCNDEFReaderSession\` + \`NFCNDEFWriterSession\` writing plain-text \`CriderGPT-XXXXXX\`. NEVER lock.

**IAP:** StoreKit 2 for Plus/Pro/Lifetime — mirror into \`iap_purchases\` table via Edge Function. NEVER Stripe for digital goods on iOS.

**Build pipeline:** EAS Cloud Build or GitHub Actions w/ macOS runner — signed \`.ipa\` without owning a Mac. \`Info.plist\` keys: NSCameraUsageDescription, NSMicrophoneUsageDescription, NFCReaderUsageDescription, NSPhotoLibraryUsageDescription, NSLocationWhenInUseUsageDescription.

**AdMob (free-tier only):**
- SPM / CocoaPods: \`GoogleMobileAds\` SDK.
- \`Info.plist\`: \`GADApplicationIdentifier\` = \`ca-app-pub-1884621321896668~7174244598\`.
- Unit IDs: same string values as Android (Google serves the correct creative per platform): Rewarded \`ca-app-pub-1884621321896668/8461902383\`, Interstitial \`ca-app-pub-1884621321896668/6979140189\`, Banner \`ca-app-pub-1884621321896668/5478019545\`.
- Gate all ads by subscription plan from Supabase. Plus/Pro/Lifetime = no ads.
- Surfaces mirror Android: rewarded for +5 messages, interstitial every 10th open, banner on demo.
- Use test IDs in development. NEVER click your own ads.
`,
  desktop: `### 🖥️ DESKTOP (Native — Tauri 2 + Rust + React)

**Stack:** Tauri 2, Rust 1.80+, React 18 + Vite (reuse existing UI components from web), Tailwind v3, shadcn/ui, Tokio.

**Project:** \`com.cridergpt.desktop\` · Windows 10+, macOS 12+, Linux (AppImage + .deb).

**Why Tauri (not Electron):** ~10 MB bundle vs 150 MB, native webview, real Rust backend for hardware/USB/serial — perfect for the Self-hosted Docker stack on the Ryzen box.

**Rust commands (\`#[tauri::command]\`):**
- \`docker_status\`, \`docker_restart(container)\`, \`docker_logs(container, tail)\` — control the 4-container self-hosted stack
- \`serial_list\`, \`serial_open(port, baud)\`, \`serial_write\`, \`serial_read\` — USB Data Hub
- \`nfc_read\`, \`nfc_write(text)\` — via libnfc (Linux) / PCSC (Win/Mac)
- \`local_ai_query(prompt)\` — pipe into local llama.cpp / Ollama on the Ryzen, fall back to OpenAI → Lovable AI Gateway
- \`backup_db()\` — pg_dump every 6h to local disk (mirrors Automated Local Backup)

**Supabase:** Same JS client as web; reuse \`@/integrations/supabase/client\`.

**Updater:** Tauri's built-in updater, signed releases hosted on a Supabase Storage bucket.
`,
};

function buildPrompt(opts: {
  appName: string;
  packageId: string;
  ownerName: string;
  extraNotes: string;
}) {
  const features = FEATURE_GROUPS.map(
    (g) => `**${g.name}**\n${g.items.map((i) => `- ${i}`).join("\n")}`
  ).join("\n\n");

  return `# 🚀 CRIDERGPT — FULL NATIVE REBUILD MASTER PROMPT
> Paste this entire document into Cursor, Claude Code, Codex CLI, or any agentic AI IDE.
> One spec → three platforms (Android, iOS, Desktop) → one Supabase backend.

---

## 1. WHO YOU ARE BUILDING FOR
You are building **${opts.appName}** for **${opts.ownerName}** (the developer/owner — "Jessie Crider").
The app's AI persona is **Jessie Crider** — Southern, Gen Z, FFA Historian. **0% AI-detection tone.** Never sound like a chatbot.

Package / Bundle ID: \`${opts.packageId}\`

---

## 2. NON-NEGOTIABLE HARD RULES
1. **NEVER sell user data or cookies.** Privacy is the brand.
2. **Strict Supabase RLS on every table.** Scope by \`auth.uid()\`. Roles live in \`user_roles\` (not profiles) + a \`has_role()\` SECURITY DEFINER function.
3. **Do NOT bypass school filters (GoGuardian).** Frame the app as educational.
4. **Stripe = physical/web goods ONLY.** Native mobile digital goods MUST use Apple StoreKit 2 / Google Play Billing.
5. **Google Sign-In = popup / one-tap ONLY.** Never full-page redirect, never Firebase, never SHA-1 dance.
6. **Strip EXIF/XMP** from every AI-generated image.
7. **All exported PDFs include the CriderGPT branded watermark.**
8. **Livestock NFC tags MUST stay plain-text \`CriderGPT-XXXXXX\`** — never lock the hardware, never change the format.
9. **Scan-only livestock workflow** — animals are identified by NFC scan, never manually-typed IDs.
10. **Do NOT modify any externally-managed \`android/\` folder.** Build a fresh native tree.
11. **Owner-only Dev Hub + Admin Panel** — gate every dev tool and admin route behind the \`verify_owner_identity\` RPC + \`has_role(auth.uid(),'admin')\`. Both surfaces must exist natively, not as webviews.
12. **Respect system insets on every screen.** No UI element may sit under the status bar (battery/clock/notch) or the gesture/nav bar. See §7 Safe-Area Rules — this is a ship-blocker if violated.
13. **AdMob is free-tier ONLY.** Plus/Pro/Lifetime users must see zero ads. Use Google's test ad unit IDs during development — never click your own ads.



---

## 3. SHARED BACKEND (already live — do NOT recreate)
**Supabase URL:** \`${SUPABASE_URL}\`
**Anon (publishable) key:** \`${SUPABASE_ANON}\`

Edge Functions, RLS policies, storage buckets, and 130+ tables are **already deployed**. Your job is to consume the existing API, not migrate it.

**Key tables to wire first (in order):**
1. \`profiles\`, \`user_roles\` — auth + role gating
2. \`chat_conversations\`, \`chat_messages\` — chat UI
3. \`ai_memory\`, \`ai_interactions\`, \`ai_usage\` — local-first AI memory loop
4. \`livestock_animals\`, \`livestock_tags\`, \`livestock_tag_pool\`, \`livestock_scan_logs\`
5. \`store_products\`, \`store_orders\`, \`store_purchases\`
6. \`subscriptions\`, \`user_subscriptions\`, \`iap_purchases\`, \`plan_configurations\`
7. \`chapters\`, \`user_ffa_profiles\`, \`events\`
8. \`pc_events\`, \`pc_outbox\`, \`server_commands\` (DevHub server control)

**Edge functions to call (already deployed):**
- \`chat\` — streaming chat (Lovable AI Gateway w/ google/gemini-3-flash-preview)
- \`generate-image\`, \`generate-music\`, \`generate-voice\`
- \`create-stripe-checkout\`, \`stripe-webhook\`
- \`verify-iap\` — mirrors StoreKit / Play Billing receipts into \`iap_purchases\`
- \`process-mod-zip\`, \`backup-db\`, \`run-agent-swarm\`

---

## 4. FEATURE COVERAGE (every single one — ship them all)

${features}

---

## 5. PLATFORM IMPLEMENTATIONS (build all three in parallel)

${PLATFORM_BLOCKS.android}

${PLATFORM_BLOCKS.ios}

${PLATFORM_BLOCKS.desktop}

---

## 6. SHARED CONTRACTS (keep these identical across all three platforms)

**Auth flow:** Supabase email/password + Google OAuth popup → JWT stored in secure storage (Keychain / Keystore / Stronghold) → attached to every PostgREST + Edge Function call.

**Chat message shape:**
\`\`\`json
{ "id": "uuid", "conversation_id": "uuid", "role": "user|assistant|system",
  "content": "string", "parts": [{"type":"text|image|tool","..." : "..."}],
  "created_at": "iso8601" }
\`\`\`

**Local-first AI loop (run on every user message):**
1. Embed query → vector search \`ai_memory\` + \`cridergpt_training_corpus\`.
2. If top-k similarity > 0.85 → respond from memory.
3. Else → call \`chat\` edge function (local OpenAI proxy → Lovable AI Gateway fallback).
4. Store the new exchange back into \`ai_memory\` with the Jessie persona tag.

**Error UX:** 429 = "Hold up, sugar — too many requests, try again in a sec." 402 = direct user to billing. Never swallow errors.

**AdMob contract (identical across Android & iOS):**
- Initialize once at app cold start: \`MobileAds.initialize(context)\` (Android) / \`GADMobileAds.sharedInstance().start()\` (iOS).
- Before ANY ad load, check user's plan from Supabase. If plan ∈ {plus, pro, lifetime} → do not initialize/load/show.
- Rewarded must ALWAYS be user-initiated (button tap). Never autoplay rewarded.
- Interstitial cooldown: max 1 per 10 app opens, never between rapid screen changes.
- Banner: bottom-center, adaptive size, removed when the screen leaves.
- Test IDs during development; production IDs only in release builds.

---

## 7. DESIGN SYSTEM + SAFE-AREA RULES
- Dark theme by default. Brand color: deep red/black palette (match existing web).
- Typography: SF Pro on iOS, Inter on Android/Desktop, NEVER serif.
- Icons: lucide-react on desktop, SF Symbols on iOS, Material Symbols on Android.
- Mobile lists: horizontal scroll with \`overflow-x-auto no-scrollbar\` semantics.
- NO purple/indigo AI-default gradients. NO "brain" icons in branding.

**Safe-area / status-bar handling (mandatory — do NOT overlap the battery icon, clock, notch, camera cutout, or gesture bar):**
- **Android (Compose):** call \`enableEdgeToEdge()\` in every Activity \`onCreate\`. Wrap root in \`Scaffold\` and consume \`WindowInsets.systemBars\` / \`WindowInsets.displayCutout\` via \`Modifier.windowInsetsPadding(...)\`. Top app bars use \`TopAppBarDefaults\` with \`windowInsets = TopAppBarDefaults.windowInsets\`. Bottom nav uses \`NavigationBar\` (auto-handles nav bar inset). For full-bleed screens use \`Modifier.safeDrawingPadding()\`. Set \`android:windowSoftInputMode="adjustResize"\` + use \`imePadding()\` so the keyboard never covers inputs. Status bar icons: \`WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false\` for the dark theme.
- **iOS (SwiftUI):** never set \`.ignoresSafeArea()\` on interactive content. Use \`NavigationStack\` + \`.safeAreaInset(edge:)\` for custom bars. For full-bleed backgrounds, paint the background with \`.ignoresSafeArea()\` but keep foreground inside the safe area. Honor Dynamic Island / notch via \`GeometryReader { $0.safeAreaInsets }\` when building custom headers. Status bar style: \`.preferredColorScheme(.dark)\` + \`UIStatusBarStyle.lightContent\`.
- **Tauri desktop:** respect the title-bar region; if using \`decorations: false\` with a custom titlebar, reserve 32 px top drag region (macOS traffic-light inset = 80 px left padding when \`titleBarStyle: 'overlay'\`).
- **Test matrix:** verify on Pixel 8 (punch-hole), Pixel Fold, iPhone 15 Pro (Dynamic Island), iPhone SE (no notch), iPad, and a 3-button-nav Android device. Screenshots of the home/chat/devhub screens must show ZERO overlap with system chrome.

---

## 8. BUILD ORDER (do them in this order, don't skip)
1. **Auth** — Supabase + Google popup OAuth on all 3 platforms, profile sync.
2. **App shell + safe-area scaffolding** — edge-to-edge enabled, insets consumed, tested on notch + gesture-nav devices BEFORE building any feature on top.
3. **Chat** — streaming chat against the \`chat\` edge function, Jessie persona, conversation list.
4. **Local-first AI memory loop** — vector search + write-back.
5. **Livestock scan-only workflow** — NFC read/write + animal CRUD.
6. **Store** — product list, cart, Stripe checkout (desktop/Android web flow), StoreKit/Play Billing for IAP.
7. **AdMob SDK & ad surfaces** — initialize with App ID, wire rewarded/interstitial/banner units, gate every load behind subscription plan. Test with Google's test IDs first; production IDs only in release builds.
8. **Chapters + Events** — two-tier visibility.
9. **Admin Panel (role-gated)** — user list, role assignment, subscription overrides, content moderation. Gate with \`has_role(auth.uid(),'admin')\`.
10. **DevHub (owner-gated)** — server console, agent dispatcher, autopilot queue, native-rebuild tools, idea planner. Gate with \`verify_owner_identity\` RPC. Must live in the main nav alongside the Admin Panel (mirror the web app's Admin section).
11. **Integrations** — Snapchat, TikTok, USB hub, self-hosted Docker control.
12. **Polish** — onboarding, paywall UX, error toasts, offline fallbacks.


---

## 9. WHEN YOU FINISH
Each platform must produce:
- A signed release artifact (\`.aab\` + \`.apk\` for Android, \`.ipa\` for iOS, \`.dmg\` + \`.msi\` + \`.AppImage\` for desktop).
- A README with build/run instructions.
- A \`CHANGELOG.md\` seeded with v1.0.0.
- Screenshots of every primary screen.

${opts.extraNotes ? `\n---\n\n## 10. EXTRA NOTES FROM JESSIE\n${opts.extraNotes}\n` : ""}

---

**Now go. Build it all. No mocks, no placeholders, no "TODO: implement later." Ship it.**
`;
}

export default function NativeRebuildPrompt() {
  const [appName, setAppName] = useState("CriderGPT");
  const [packageId, setPackageId] = useState("com.cridergpt.app");
  const [ownerName, setOwnerName] = useState("Jessie Crider");
  const [extraNotes, setExtraNotes] = useState("");

  const prompt = useMemo(
    () => buildPrompt({ appName, packageId, ownerName, extraNotes }),
    [appName, packageId, ownerName, extraNotes]
  );

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Master prompt copied — paste it into Cursor / Claude Code / Codex CLI.");
  };

  const download = () => {
    const blob = new Blob([prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cridergpt-native-rebuild.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded cridergpt-native-rebuild.md");
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-2">
            <div>
              <Link to="/devhub" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Dev Hub
              </Link>
              <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
                <Rocket className="w-7 h-7 text-primary" />
                CriderGPT Full-Native Rebuild Prompt
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                One master prompt → Android (Kotlin + Compose) + iOS (Swift + SwiftUI) + Desktop (Tauri + Rust). Same Supabase backend.
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/30">All 60+ Features</Badge>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure</CardTitle>
              <CardDescription>These values get baked into the prompt.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app">App name</Label>
                <Input id="app" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pkg">Package / Bundle ID</Label>
                <Input id="pkg" value={packageId} onChange={(e) => setPackageId(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="owner">Owner name</Label>
                <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Extra notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Anything platform-specific you want the AI IDE to know..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Master Prompt ({prompt.length.toLocaleString()} chars)</CardTitle>
                <CardDescription>Covers all {FEATURE_GROUPS.reduce((n, g) => n + g.items.length, 0)} features across {FEATURE_GROUPS.length} groups.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={copy}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
                <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-1" /> Download .md</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={prompt}
                className="font-mono text-xs h-[600px] resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
