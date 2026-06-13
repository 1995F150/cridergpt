import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Search, Smartphone, Apple, Globe, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  SUBSCRIPTION_IDEAS,
  SUBSCRIPTION_CATEGORIES,
  type SubscriptionIdea,
} from "./subscriptionIdeasData";

type Platform = "android" | "ios" | "web";

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Smartphone; idHint: (pkg: string) => string }> = {
  android: { label: "Android", icon: Smartphone, idHint: (p) => p },
  ios: { label: "iOS", icon: Apple, idHint: (p) => `app.cridergpt.${p.split(".").pop() ?? "app"}` },
  web: { label: "Web", icon: Globe, idHint: (p) => `/${(p.split(".").pop() ?? "app").toLowerCase()}` },
};

function androidPrompt(i: SubscriptionIdea) {
  return `You are an expert Android engineer building a NATIVE Kotlin + Jetpack Compose app (no Capacitor, no React Native).

APP NAME: ${i.name}
PACKAGE: ${i.pkg}
CATEGORY: ${i.category}
SUBSCRIPTION TIER: ${i.tier.toUpperCase()}
MONTHLY: $${i.monthly.toFixed(2)}  YEARLY: $${i.yearly.toFixed(2)}

WHAT IT DOES
${i.desc}

REQUIRED STACK
- Kotlin 2.x, Jetpack Compose, Material 3, MVVM + Hilt, Room + DataStore, Coroutines/Flow, WorkManager
- Supabase Kotlin SDK (auth + Postgres + RLS). Do NOT use Lovable Cloud — connect to the user's Supabase project.
- Google Play Billing v6 for the recurring subscription. Product IDs:
    ${i.pkg}.monthly  ($${i.monthly.toFixed(2)}/mo)
    ${i.pkg}.yearly   ($${i.yearly.toFixed(2)}/yr)
- Verify every purchase server-side through the existing CriderGPT verify-iap edge function.
- Offline-first reads, background sync, FCM push for renewal/expiry reminders.

DELIVER (one PART per response, stop and wait)
PART 1: Gradle setup, package skeleton, MainActivity + Compose theme + nav graph.
PART 2: Room schema + Supabase table SQL with RLS + GRANT statements.
PART 3: Main feature screens (list / detail / create / edit) wired to Room first, then Supabase sync.
PART 4: Billing flow — paywall sheet, monthly+yearly toggle, restore purchases, server-side verify call.
PART 5: Settings (account, sign out, delete account, export to CSV).
PART 6: Play Console asset checklist + signed AAB + internal-testing track upload.

RULES
- No deprecated APIs. Material 3 only. Adaptive icons. Per-feature runtime permissions.
- No placeholders, no TODOs. Stop after each PART.

Start with PART 1 now.`;
}

function iosPrompt(i: SubscriptionIdea) {
  const tail = i.pkg.split(".").pop() ?? "app";
  const bundle = `app.cridergpt.${tail}`;
  return `You are an expert iOS engineer building a NATIVE Swift 5.9 + SwiftUI app (iOS 16+, no React Native, no Flutter, no Capacitor).

APP NAME: ${i.name}
BUNDLE ID: ${bundle}
CATEGORY: ${i.category}
SUBSCRIPTION TIER: ${i.tier.toUpperCase()}
MONTHLY: $${i.monthly.toFixed(2)}  YEARLY: $${i.yearly.toFixed(2)}

WHAT IT DOES
${i.desc}

REQUIRED STACK
- Swift 5.9 + SwiftUI, MVVM, Combine, SwiftData (Core Data fallback for iOS 16)
- Supabase Swift SDK for auth + Postgres + RLS. Do NOT use Lovable Cloud.
- StoreKit 2 auto-renewing subscriptions. Product IDs:
    ${bundle}.monthly  ($${i.monthly.toFixed(2)}/mo)
    ${bundle}.yearly   ($${i.yearly.toFixed(2)}/yr)
- Verify every transaction via App Store Server Notifications relay → existing verify-iap edge function.
- Sign in with Apple as primary auth; offline-first reads.

DELIVER (one PART per response, stop and wait)
PART 1: Xcode project skeleton, Info.plist privacy strings (only what's needed), Config.plist with SUPABASE_URL + ANON_KEY.
PART 2: SwiftData models + Supabase SQL migrations with RLS + GRANT statements.
PART 3: Feature screens — list, detail, create/edit — local store first, then cloud sync.
PART 4: StoreKit 2 paywall sheet (monthly/yearly toggle), restore purchases, expiration reminders.
PART 5: Settings — account, sign out, delete account, export JSON/CSV.
PART 6: App Store assets — 6.7" + 6.1" screenshots, 1024 icon, privacy nutrition labels.
PART 7: TestFlight + EAS-Cloud-Build no-Mac workflow.

RULES
- HIG: SF Symbols, system fonts, Dynamic Type, dark mode, VoiceOver labels.
- Stripe is BANNED for digital subscriptions on iOS. StoreKit 2 only.
- No TODOs, no placeholders. Stop after each PART.

Start with PART 1 now.`;
}

function webPrompt(i: SubscriptionIdea) {
  const slug = (i.pkg.split(".").pop() ?? "app").toLowerCase();
  return `You are an expert full-stack web engineer using Lovable. Build a production-ready web app for a recurring subscription.

APP NAME: ${i.name}
ROUTE SLUG: /${slug}
CATEGORY: ${i.category}
SUBSCRIPTION TIER: ${i.tier.toUpperCase()}
MONTHLY: $${i.monthly.toFixed(2)}  YEARLY: $${i.yearly.toFixed(2)}

WHAT IT DOES
${i.desc}

REQUIRED STACK (NON-NEGOTIABLE)
- React 18 + Vite + TypeScript + Tailwind v3 + shadcn/ui
- BACKEND: Supabase (NOT Lovable Cloud). If the workspace defaults to Lovable Cloud, swap it before any backend code is written.
- Auth: Supabase email/password + Google OAuth in a popup (no full-page redirect)
- Roles in a separate user_roles table with a has_role() SECURITY DEFINER function. Never on profiles.
- Postgres with RLS on every table. Every CREATE TABLE must be followed by GRANT statements in the SAME migration.
- Edge Functions: Deno, esm.sh imports, CORS headers on every response.
- Payments: Stripe Subscriptions via an edge function. Create monthly + yearly prices.
- SEO: react-helmet-async, single H1, meta description < 160 chars, JSON-LD, canonical tags, sitemap entry.

DELIVER (one PART per response, stop and wait)
PART 1: Route + page skeleton, semantic HSL design tokens in index.css, responsive layout, SEO head.
PART 2: Supabase migration SQL — tables + RLS + GRANTs + indexes + triggers. Paste the full SQL.
PART 3: Data hooks with @tanstack/react-query, Supabase client, optimistic updates.
PART 4: Main UI with shadcn — list / detail / create / edit, toast feedback, loading + empty + error states.
PART 5: Auth gate, profile, sign-out, account deletion edge function.
PART 6: Stripe subscription edge functions — create-checkout (monthly/yearly toggle), customer-portal, check-subscription. Webhook handler that flips an entitlements row.
PART 7: Mobile polish — overflow-x-auto no-scrollbar lists, 44px tap targets, no layout shift.
PART 8: Cross-platform sync notes — list every table + edge function so the iOS and Android clones share the same Supabase project.

RULES
- No hardcoded color utilities (no text-white, no bg-[#...]). Semantic tokens only.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
- One H1 per page. Alt text on images. Lazy-load below the fold.
- Stop after each PART. No TODOs.

Start with PART 1 now.`;
}

const PROMPT_BUILDERS: Record<Platform, (i: SubscriptionIdea) => string> = {
  android: androidPrompt,
  ios: iosPrompt,
  web: webPrompt,
};

export default function SubscriptionIdeasPage({ platform }: { platform: Platform }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SUBSCRIPTION_IDEAS.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (tier !== "all" && i.tier !== tier) return false;
      if (!needle) return true;
      return (
        i.name.toLowerCase().includes(needle) ||
        i.desc.toLowerCase().includes(needle) ||
        i.pkg.toLowerCase().includes(needle)
      );
    });
  }, [q, cat, tier]);

  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const build = PROMPT_BUILDERS[platform];

  const copy = async (i: SubscriptionIdea) => {
    await navigator.clipboard.writeText(build(i));
    toast({ title: "Prompt copied", description: `${meta.label} subscription prompt for ${i.name}` });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-primary" />
                  1,000 {meta.label} Subscription Ideas
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Recurring-revenue companion concepts to the 150 one-time ideas. Fit Jessie's niches: livestock, farming, FFA, welding, ag-finance, hunting, faith, creator tools.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search 1,000 ideas…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {SUBSCRIPTION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filtered.length.toLocaleString()} of {SUBSCRIPTION_IDEAS.length.toLocaleString()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 300).map((i) => (
              <Card key={i.pkg} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{i.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                      {i.tier}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono break-all">
                    {meta.idHint(i.pkg)}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">${i.monthly.toFixed(2)}/mo</Badge>
                    <Badge variant="secondary" className="text-[10px]">${i.yearly.toFixed(2)}/yr</Badge>
                    <Badge variant="outline" className="text-[10px]">{i.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground line-clamp-4">{i.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-auto"
                    onClick={() => copy(i)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy {meta.label} prompt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length > 300 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Showing first 300 results — use the search and filters above to narrow further.
            </p>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
