import { useEffect, useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, ClipboardList, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { APP_VERSION, VERSION_NAME, RELEASE_DATE, VERSION_FEATURES } from "@/config/appVersion";


interface PromptBlock {
  id: string;
  part: string;
  title: string;
  status: "done" | "now" | "future";
  body: string;
  createdAt: number;
}

const KEY = "cridergpt-android-agent-prompts-v1";

const SEED: PromptBlock[] = [
  {
    id: "part-1",
    part: "Part 1",
    title: "Auth + Remove Placeholders",
    status: "done",
    body: `# Android Agent Prompt — Part 1: Auth + Remove Placeholders

Scope: Native Kotlin/Compose app at android_app/ (package app.cridergpt.android).
Backend: Supabase project udpldrrpebdyuiqdtqnq. Use anon key from BuildConfig.

Tasks:
1. Wire Google Sign-In using Chrome Custom Tabs to Supabase OAuth (no Firebase, no SHA-1).
2. Wire email/password sign in + sign up via Supabase GoTrue REST.
3. Store session in EncryptedSharedPreferences. Refresh on app start.
4. Remove every "John Doe" / "user@example.com" placeholder. Bind real auth.user.email + profiles.display_name.
5. AuthViewModel exposes StateFlow<User?>.

DO NOT touch marketing, livestock, or billing screens in this part.`,
    createdAt: Date.now(),
  },
  {
    id: "part-2",
    part: "Part 2",
    title: "Real AI Chat + Drawer + Owner Gating",
    status: "done",
    body: `# Android Agent Prompt — Part 2: Chat + Drawer + Gating

Backend:
- Edge function: chat-with-ai (POST, JSON { messages: [...] })
- Tables: chat_conversations, chat_messages

Tasks:
1. ChatScreen.kt streams responses from chat-with-ai using OkHttp SSE.
2. Persist conversations + messages to Supabase.
3. ModalDrawerSheet with: Chat, Livestock, Calendar, Calculators, Settings, DevHub (owner only).
4. Owner gating: call RPC is_owner(auth.uid()); cache result. Hide DevHub for non-owners.

DO NOT add NFC or Play Billing yet.`,
    createdAt: Date.now(),
  },
  {
    id: "part-3",
    part: "Part 3",
    title: "NFC + Play Billing + Push",
    status: "future",
    body: `# Android Agent Prompt — Part 3: NFC + Billing + Push (FUTURE)

To be written when ready. Will cover:
- NFC plain-text CriderGPT-XXXXXX scan/write
- Google Play Billing for cridergpt_plus_monthly + cridergpt_pro_monthly
- verify-iap edge function call
- FCM push tied to push_subscriptions table`,
    createdAt: Date.now(),
  },
  {
    id: "part-4",
    part: "Part 4",
    title: "Media Studio",
    status: "future",
    body: `# Android Agent Prompt — Part 4: Media Studio (FUTURE)

Will cover AI image gen, MusicGen, video, speech-to-text via the self-hosted voice engine + Lovable AI fallback.`,
    createdAt: Date.now(),
  },
  {
    id: "part-5",
    part: "Part 5",
    title: "Settings + Integrations + Marketing Auto-Post",
    status: "now",
    body: `# Android Agent Prompt — Part 5: Settings, Integrations, Marketing Auto-Post

App: android_app/ (Kotlin + Jetpack Compose, package app.cridergpt.android).
Backend: Supabase project udpldrrpebdyuiqdtqnq.

== 1. SettingsScreen.kt (settings/) ==
- Profile card: avatar, display_name, email from AuthViewModel.user (no placeholders).
- Buttons: Edit Profile, Change Password, Sign Out, Delete Account.
- Toggles: Dark Mode (persist in DataStore), Notifications.
- Read/write profiles table: id = auth.uid().

== 2. IntegrationsScreen.kt (integrations/) ==
- List of connected services from tiktok_tokens (owner only).
- "Connect TikTok" button → opens Chrome Custom Tab to:
    https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/tiktok-auth?user_id=<uid>
- Handle deep link callback app.cridergpt.android://oauth/tiktok → refresh list.
- Disconnect button deletes the row.

== 3. MarketingAutoPostScreen.kt (marketing/) ==
- Owner only (gate via is_owner RPC).
- Query marketing_auto_post_queue ordered by created_at desc.
- Row: source_type chip, caption preview, status chip (queued/posting/posted/failed), retry count.
- FAB: manual add (caption + video_url).
- Row actions: Retry (set status=queued), Cancel, Delete.
- Supabase Realtime channel on the table → live updates.
- "Run Now" button POSTs to functions/v1/marketing-auto-post.

== 4. DevHubScreen.kt — real tools ==
- Tiles: System Health, Build Logs, Marketing Auto-Post (nav to screen above),
  Server Console, Admin Panel (if isAdmin).
- Hide entire screen + nav entry when !isOwner.

== 5. Navigation ==
- Add routes: settings, integrations, marketing_auto_post, devhub.
- Gear icon in TopAppBar opens settings.

== Verification ==
- No "John Doe" or lorem text anywhere.
- Dark mode persists across cold start.
- Sign out clears EncryptedSharedPreferences + nav to AuthScreen.
- TikTok connect round-trip works; disconnect removes row.
- Realtime: insert a row in Supabase → appears in app < 2s.
- Non-owner account: DevHub tile hidden, /devhub route redirects.

DO NOT modify Part 1–4 screens, AndroidManifest beyond adding the oauth/tiktok intent-filter, or build.gradle dependencies beyond what Compose + OkHttp + Coil already provide.`,
    createdAt: Date.now(),
  },
  {
    id: "part-6",
    part: "Part 6",
    title: "Marketing Auto-Post Backend (web)",
    status: "done",
    body: `# Part 6 — Marketing Auto-Post Backend (DONE, web side)

Already shipped:
- Table: marketing_auto_post_queue
- Triggers: auto-enqueue on store_products / seo_guides / livestock_animals insert
- Edge function: marketing-auto-post (drains queue, refreshes TikTok token, PULL_FROM_URL)
- Web UI: /devhub/marketing-auto-post

Android side = Part 5.`,
    createdAt: Date.now(),
  },
];

const statusColor = (s: PromptBlock["status"]) =>
  s === "done" ? "bg-green-500/10 text-green-700 border-green-200"
  : s === "now" ? "bg-orange-500/10 text-orange-700 border-orange-200"
  : "bg-gray-500/10 text-gray-700 border-gray-200";

export default function AndroidAgentPrompts() {
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPart, setNewPart] = useState("");
  const [newBody, setNewBody] = useState("");

  useEffect(() => {
    let initial: PromptBlock[] = SEED;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) initial = JSON.parse(raw);
    } catch {}
    const synced = ensureSyncBlock(initial);
    setBlocks(synced);
    localStorage.setItem(KEY, JSON.stringify(synced));
  }, []);

  const persist = (next: PromptBlock[]) => {
    setBlocks(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const regenerateSync = () => {
    const filtered = blocks.filter(b => !b.id.startsWith("sync-"));
    persist(ensureSyncBlock(filtered, true));
    toast.success(`Sync prompt regenerated for v${APP_VERSION}`);
  };


  const copy = async (b: PromptBlock) => {
    await navigator.clipboard.writeText(b.body);
    setCopiedId(b.id);
    toast.success(`${b.part} copied — paste into Android Studio agent`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const add = () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    const next: PromptBlock = {
      id: crypto.randomUUID(),
      part: newPart || `Part ${blocks.length + 1}`,
      title: newTitle,
      status: "now",
      body: newBody,
      createdAt: Date.now(),
    };
    persist([next, ...blocks]);
    setNewTitle(""); setNewPart(""); setNewBody("");
    toast.success("Prompt block added");
  };

  const del = (id: string) => persist(blocks.filter(b => b.id !== id));

  const resetSeed = () => {
    localStorage.removeItem(KEY);
    setBlocks(SEED);
    localStorage.setItem(KEY, JSON.stringify(SEED));
    toast.success("Reset to default 6-part plan");
  };

  return (
    <DevHubPage
      title="Android Agent Prompts"
      subtitle="Section-by-section prompts for the Android Studio AI agent. Copy one block at a time so the agent doesn't lose context or insert placeholders."
    >
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={resetSeed}>Reset to default plan</Button>
      </div>

      <div className="space-y-3 mb-6">
        {blocks.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{b.part}</Badge>
                  <Badge variant="outline" className={statusColor(b.status)}>
                    {b.status === "done" ? "Done" : b.status === "now" ? "Now" : "Future"}
                  </Badge>
                  <CardTitle className="text-base">{b.title}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => copy(b)}>
                    {copiedId === b.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(b.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-[11px] whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded max-h-64 overflow-y-auto">
                {b.body}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Custom Prompt Block
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Part 7" value={newPart} onChange={e => setNewPart(e.target.value)} />
            <Input className="sm:col-span-2" placeholder="Title (e.g. Push Notifications)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          </div>
          <Textarea rows={6} placeholder="Full agent prompt body..." value={newBody} onChange={e => setNewBody(e.target.value)} />
          <Button onClick={add} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add Block</Button>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> Stored locally in your browser. Copy one block at a time into the Android Studio agent for best results.
          </p>
        </CardContent>
      </Card>
    </DevHubPage>
  );
}
