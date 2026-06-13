import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Database, Cloud, Key } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_PROJECT_REF = "udpldrrpebdyuiqdtqnq";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

type Fn = { name: string; purpose: string; auth: "public" | "jwt"; group: string };

const FUNCTIONS: Fn[] = [
  // Chat / AI
  { name: "chat-with-ai", purpose: "Main CriderGPT chat completion (OpenAI + Lovable AI fallback).", auth: "public", group: "AI / Chat" },
  { name: "agi-chat", purpose: "Autonomous AGI loop with tool calling.", auth: "public", group: "AI / Chat" },
  { name: "demo-chat", purpose: "Guest/demo chat (5 free messages).", auth: "public", group: "AI / Chat" },
  { name: "chat-operations", purpose: "Conversation CRUD + summarization helpers.", auth: "public", group: "AI / Chat" },
  { name: "openai-realtime-token", purpose: "Mints ephemeral OpenAI Realtime API token for live voice.", auth: "public", group: "AI / Chat" },
  { name: "text-to-speech", purpose: "Server TTS (OpenAI / XTTS proxy).", auth: "public", group: "AI / Chat" },
  { name: "speech-to-text", purpose: "Whisper STT for voice input.", auth: "jwt", group: "AI / Chat" },
  { name: "generate-ai-image", purpose: "AI image generation (Gemini / OpenAI). EXIF stripped.", auth: "public", group: "AI / Chat" },
  { name: "generate-video", purpose: "AI video generation proxy.", auth: "public", group: "AI / Chat" },
  { name: "generate-music", purpose: "MusicGen proxy to self-hosted server.", auth: "public", group: "AI / Chat" },
  { name: "generate-app-icon", purpose: "Generates app icons for native builds.", auth: "public", group: "AI / Chat" },
  { name: "generate-code", purpose: "Code generation for the Swift/Kotlin/React generator.", auth: "jwt", group: "AI / Chat" },
  { name: "generate-idea-blueprint", purpose: "Expands an idea into a build blueprint.", auth: "jwt", group: "AI / Chat" },
  { name: "document-ai-analysis", purpose: "Parse + summarize uploaded docs.", auth: "public", group: "AI / Chat" },
  { name: "swarm-orchestrator", purpose: "150-agent parallel swarm coordinator.", auth: "public", group: "AI / Chat" },

  // Auth / Account
  { name: "delete-account", purpose: "Hard-deletes the signed-in user + their data.", auth: "jwt", group: "Auth / Account" },
  { name: "export-user-data", purpose: "GDPR-style export of all user data.", auth: "jwt", group: "Auth / Account" },
  { name: "passphrase-verify", purpose: "Verifies owner passphrase for Dev Hub access.", auth: "jwt", group: "Auth / Account" },
  { name: "fix-user-plan", purpose: "Repairs user_plan/tier mismatches after Stripe events.", auth: "jwt", group: "Auth / Account" },

  // Payments
  { name: "create-checkout", purpose: "Stripe Checkout for subscriptions (Plus/Pro).", auth: "jwt", group: "Payments" },
  { name: "lifetime-checkout", purpose: "Stripe Checkout for one-time Lifetime plan.", auth: "jwt", group: "Payments" },
  { name: "filter-checkout", purpose: "Stripe Checkout for Snapchat custom filters.", auth: "jwt", group: "Payments" },
  { name: "customer-portal", purpose: "Stripe customer portal session.", auth: "jwt", group: "Payments" },
  { name: "check-subscription", purpose: "Returns live subscription status for the user.", auth: "jwt", group: "Payments" },
  { name: "verify-subscription", purpose: "Reconciles Supabase tier with Stripe.", auth: "jwt", group: "Payments" },
  { name: "stripe-webhooks", purpose: "Stripe webhook receiver (subscriptions).", auth: "public", group: "Payments" },
  { name: "stripe-webhook-checkout", purpose: "Stripe webhook receiver (checkout.session.completed).", auth: "public", group: "Payments" },
  { name: "verify-iap", purpose: "Android Play Billing IAP verifier (cridergpt_plus_monthly, cridergpt_pro_monthly).", auth: "jwt", group: "Payments" },
  { name: "play-rtdn", purpose: "Google Play Real-time Developer Notifications receiver.", auth: "public", group: "Payments" },

  // Livestock
  { name: "claim-tag", purpose: "Claims a CriderGPT-XXXXXX tag to an animal.", auth: "jwt", group: "Livestock" },
  { name: "tag-lookup", purpose: "Public scan-only lookup for a livestock tag.", auth: "public", group: "Livestock" },
  { name: "scan-card", purpose: "NFC/QR scan ingest endpoint.", auth: "public", group: "Livestock" },
  { name: "manage-livestock-access", purpose: "Share/revoke livestock access between users.", auth: "jwt", group: "Livestock" },

  // PC / Server / Self-host
  { name: "pc-ingest", purpose: "Self-hosted PC pushes events / polls outbox (X-PC-Token header).", auth: "public", group: "Self-Host / PC" },
  { name: "register-pc", purpose: "Registers a new PC link with a pairing code.", auth: "jwt", group: "Self-Host / PC" },
  { name: "mint-pc-token", purpose: "Mints a long-lived ingest token for a paired PC.", auth: "jwt", group: "Self-Host / PC" },
  { name: "home-server-proxy", purpose: "Proxy to user's home server (LAN bridge).", auth: "jwt", group: "Self-Host / PC" },
  { name: "create-worker-job", purpose: "Queues a job for a worker node.", auth: "jwt", group: "Self-Host / PC" },
  { name: "system-diagnostics", purpose: "Server health + container diagnostics.", auth: "jwt", group: "Self-Host / PC" },
  { name: "dev-autopilot-runner", purpose: "Drains the autopilot queue every 2 min.", auth: "public", group: "Self-Host / PC" },

  // Integrations
  { name: "snapchat-auth", purpose: "Snap Kit OAuth callback + Bitmoji.", auth: "public", group: "Integrations" },
  { name: "tiktok-auth", purpose: "TikTok OAuth callback.", auth: "public", group: "Integrations" },
  { name: "tiktok-post-video", purpose: "Posts a video via TikTok Content Posting API.", auth: "public", group: "Integrations" },
  { name: "marketing-auto-post", purpose: "Auto-posts new products/guides to TikTok every 15 min.", auth: "public", group: "Integrations" },
  { name: "youtube-search", purpose: "YouTube Data API search proxy.", auth: "public", group: "Integrations" },
  { name: "mcp-server", purpose: "Model Context Protocol server for external AI clients.", auth: "public", group: "Integrations" },
  { name: "cridergpt-public-api", purpose: "Public API gateway (rate-limited, key-gated).", auth: "public", group: "Integrations" },
  { name: "cridergpt-api", purpose: "Internal CriderGPT API helper.", auth: "jwt", group: "Integrations" },
  { name: "cridergpt-admin", purpose: "Admin-only operations (owner gated).", auth: "jwt", group: "Integrations" },
  { name: "cridergpt-sms", purpose: "SMS dispatch via provider.", auth: "jwt", group: "Integrations" },

  // Misc
  { name: "calendar-events", purpose: "Calendar event CRUD + reminders.", auth: "public", group: "Misc" },
  { name: "send-broadcast", purpose: "Sends a broadcast notification to users.", auth: "public", group: "Misc" },
  { name: "send-feedback", purpose: "User feedback submission.", auth: "jwt", group: "Misc" },
  { name: "chapter-request-email", purpose: "Emails FFA chapter requests to owner.", auth: "public", group: "Misc" },
  { name: "process-mod-zip", purpose: "Unpacks/edits/repacks FS25 mod ZIPs.", auth: "public", group: "Misc" },
  { name: "product-tools", purpose: "Store product helpers (pricing, fulfillment).", auth: "public", group: "Misc" },
  { name: "analyze-child-activity", purpose: "Guardian mode child-activity analysis.", auth: "jwt", group: "Misc" },
  { name: "feature-backend-routine", purpose: "Background routine for feature backends.", auth: "jwt", group: "Misc" },
];

const TABLES_BY_GROUP: Record<string, string[]> = {
  "Auth / Profiles": ["profiles", "user_roles", "user_profiles", "user_ffa_profiles", "user_preferences", "user_notifications", "user_streaks", "user_subscriptions", "user_activity_log", "user_contacts", "user_violations", "user_reports", "owner_passphrases", "founders", "system_owners"],
  "AI / Chat": ["chat_conversations", "chat_messages", "ai_memory", "ai_memory_review", "ai_interactions", "ai_feedback", "ai_usage", "ai_infrastructure_settings", "vision_memory", "voice_profiles", "imported_messages", "conversation_imports", "cridergpt_training_corpus", "cridergpt_training_data", "training_inputs", "writing_samples", "character_references", "user_reference_library", "media_generations", "music_tracks", "learning_queue", "agent_swarm_sessions", "agent_swarm_tasks", "agent_execution_queue", "agent_status", "hybrid_router_settings"],
  "Plans / Payments": ["plan_configurations", "platform_subscriptions", "subscriptions", "prices", "products", "customers", "tier_upgrade_logs", "lifetime_plan_config", "iap_purchases", "usage_controls", "demo_usage", "feature_throttles", "feature_settings", "feature_notifications", "share_unlocks", "referrals", "referral_codes"],
  "Store / Orders": ["store_products", "store_orders", "store_cart_items", "store_purchases", "store_reviews", "digital_products", "orders", "receipts", "buyers", "filter_orders", "tag_orders", "pos_transactions", "product_ideas"],
  "Livestock": ["livestock_animals", "livestock_tags", "livestock_tag_pool", "livestock_access", "livestock_transfers", "livestock_notes", "livestock_health_records", "livestock_weights", "livestock_production", "livestock_scan_logs", "livestock_devices", "livestock_device_logs"],
  "FFA / Chapters": ["chapters", "chapter_officers", "chapter_requests", "chapter_activity", "chapter_awards", "events", "farmbureau_leads"],
  "Self-Host / PC / Workers": ["pc_links", "pc_events", "pc_outbox", "pc_ingest_tokens", "saved_servers", "saved_server_secrets", "server_pairing_codes", "server_commands", "worker_jobs", "worker_nodes", "usb_data_logs", "build_logs", "dev_tasks", "launch_planner_tasks", "idea_planner_ideas"],
  "Integrations / API": ["api_keys", "api_keywords", "cridergpt_api_keys", "cridergpt_api_logs", "cridergpt_api_settings", "cridergpt_public_api_keys", "cridergpt_public_api_usage", "tiktok_tokens", "snapchat_lens_analytics", "sms_log", "sms_settings", "push_subscriptions", "digest_preferences"],
  "Guardian / Safety": ["guardian_relationships", "guardian_settings", "guardian_alerts"],
  "System / Admin": ["admin_audit_logs", "system_announcements", "system_audit", "system_info", "system_status", "broadcast_history", "app_milestones", "marketing_auto_post_queue", "seo_guides", "pending_tasks", "call_logs", "messages", "room_members", "savanaa_chats", "relationship_milestones", "spending_groups", "spending_group_members", "spending_entries", "user_patterns", "projects", "project_members"],
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

export default function BackendWiringReference() {
  const [q, setQ] = useState("");
  const { copied, copy } = useCopy();

  const filteredFns = useMemo(
    () => FUNCTIONS.filter((f) => (f.name + f.purpose + f.group).toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const groupedFns = useMemo(() => {
    const g: Record<string, Fn[]> = {};
    filteredFns.forEach((f) => {
      g[f.group] = g[f.group] || [];
      g[f.group].push(f);
    });
    return g;
  }, [filteredFns]);

  const allFnsMarkdown = useMemo(() => {
    const lines = ["# CriderGPT Supabase Edge Functions", "", `Base URL: \`${SUPABASE_URL}/functions/v1/\``, ""];
    Object.entries(
      FUNCTIONS.reduce<Record<string, Fn[]>>((acc, f) => {
        (acc[f.group] = acc[f.group] || []).push(f);
        return acc;
      }, {})
    ).forEach(([group, fns]) => {
      lines.push(`## ${group}`);
      fns.forEach((f) => lines.push(`- **${f.name}** (${f.auth === "public" ? "no JWT" : "JWT required"}) — ${f.purpose}`));
      lines.push("");
    });
    return lines.join("\n");
  }, []);

  const allTablesMarkdown = useMemo(() => {
    const lines = ["# CriderGPT Supabase Tables", ""];
    Object.entries(TABLES_BY_GROUP).forEach(([group, tables]) => {
      lines.push(`## ${group}`);
      tables.forEach((t) => lines.push(`- ${t}`));
      lines.push("");
    });
    return lines.join("\n");
  }, []);

  const credsBlock = `SUPABASE_URL=${SUPABASE_URL}
SUPABASE_PROJECT_REF=${SUPABASE_PROJECT_REF}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EDGE_FUNCTIONS_BASE=${SUPABASE_URL}/functions/v1/`;

  const nativePrompt = `You are wiring a native ${"<Android Kotlin | iOS Swift>"} app to an EXISTING Supabase backend. DO NOT create new tables or new edge functions. Reuse what already exists.

SUPABASE PROJECT:
${credsBlock}

AUTH:
- Use Supabase GoTrue (gotrue-kt for Android, supabase-swift for iOS).
- Google Sign-In: use the WEB Client ID baked into the app (same one the website uses). Android also needs an Android OAuth client in Google Cloud bound to package app.cridergpt.android + the release SHA-1 from Play App Signing, but the requestIdToken() call passes the WEB client id.
- Exchange the Google id_token via supabase.auth.signInWithIdToken({ provider: 'google', token: idToken }).

EDGE FUNCTIONS (call as POST to \`\${SUPABASE_URL}/functions/v1/<name>\` with apikey header = anon key, and Authorization: Bearer <user_jwt> when auth=jwt):

${allFnsMarkdown}

TABLES (RLS enforced — only read/write through the user's JWT, never the service role from the app):

${allTablesMarkdown}

PAYMENTS RULE:
- Web/physical goods → Stripe (create-checkout, lifetime-checkout, filter-checkout, customer-portal).
- Android digital subscriptions → Google Play Billing → verify-iap → server flips tier; play-rtdn keeps it fresh.
- iOS digital subscriptions → StoreKit 2 → (add a verify-iap-ios sibling later, do not invent now).

DO:
- Reuse table + function names exactly as listed.
- Send the anon key as \`apikey\` header on every function call.
- Persist session with the platform's secure storage.

DO NOT:
- Create duplicate tables (profiles, ai_usage, iap_purchases, livestock_animals, etc. already exist).
- Embed the service role key anywhere in the app.
- Skip the apikey header — PostgREST and edge functions will 401.`;

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <h1 className="text-3xl font-bold tracking-tight">Backend Wiring Reference</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Copy this into Gemini / Cursor / Android Studio / Xcode so the native app wires up to the existing Supabase — no duplicate tables, no duplicate functions.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Key className="w-4 h-4" /> Credentials block</CardTitle>
              <CardDescription>Anon key only. The service role key NEVER goes in a native app.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto no-scrollbar whitespace-pre-wrap break-all">{credsBlock}</pre>
              <Button size="sm" className="mt-3" onClick={() => copy(credsBlock, "creds")}>
                {copied === "creds" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy credentials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ready-to-paste native wiring prompt</CardTitle>
              <CardDescription>One block. Functions + tables + auth + payments rules. Tells the agent NOT to recreate what already exists.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => copy(nativePrompt, "prompt")}>
                {copied === "prompt" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy full wiring prompt
              </Button>
            </CardContent>
          </Card>

          <Tabs defaultValue="functions">
            <TabsList>
              <TabsTrigger value="functions"><Cloud className="w-4 h-4 mr-1" /> Edge Functions ({FUNCTIONS.length})</TabsTrigger>
              <TabsTrigger value="tables"><Database className="w-4 h-4 mr-1" /> Tables</TabsTrigger>
            </TabsList>

            <TabsContent value="functions" className="space-y-4">
              <div className="flex items-center gap-2">
                <Input placeholder="Search functions…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => copy(allFnsMarkdown, "fns-md")}>
                  {copied === "fns-md" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy all as markdown
                </Button>
              </div>
              {Object.entries(groupedFns).map(([group, fns]) => (
                <Card key={group}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fns.map((f) => (
                      <div key={f.name} className="flex items-start justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-mono">{f.name}</code>
                            <Badge variant={f.auth === "public" ? "outline" : "default"} className="text-[10px]">
                              {f.auth === "public" ? "no JWT" : "JWT"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.purpose}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy(`${SUPABASE_URL}/functions/v1/${f.name}`, f.name)}
                        >
                          {copied === f.name ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="tables" className="space-y-4">
              <Button variant="outline" size="sm" onClick={() => copy(allTablesMarkdown, "tbl-md")}>
                {copied === "tbl-md" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy all tables as markdown
              </Button>
              {Object.entries(TABLES_BY_GROUP).map(([group, tables]) => (
                <Card key={group}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{group} <span className="text-xs text-muted-foreground font-normal">({tables.length})</span></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {tables.map((t) => (
                        <button
                          key={t}
                          onClick={() => copy(t, t)}
                          className="text-xs font-mono px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                          title="Click to copy"
                        >
                          {copied === t ? <Check className="w-3 h-3 inline" /> : t}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DevHubGuard>
  );
}
