import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Search, Apple, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IDEAS, type Idea } from "./AndroidAppIdeas";

type Platform = "ios" | "web";

function bundleIdForIOS(pkg: string) {
  // com.crider.foo -> app.cridergpt.foo (matches our iOS bundle pattern)
  const tail = pkg.split(".").slice(-1)[0] ?? "app";
  return `app.cridergpt.${tail}`;
}

function slugForWeb(pkg: string) {
  const tail = pkg.split(".").slice(-1)[0] ?? "app";
  return tail.toLowerCase();
}

function buildIOSPrompt(i: Idea) {
  const bundle = bundleIdForIOS(i.pkg);
  return `You are an expert iOS engineer. Build a NATIVE iOS app using Swift 5.9 + SwiftUI (iOS 16+), no React Native, no Flutter, no Capacitor.

APP NAME: ${i.name}
BUNDLE ID: ${bundle}
ONE-TIME PRICE: $${i.price.toFixed(2)} (StoreKit 2 non-consumable IAP, product ID: ${bundle}.unlock)

WHAT IT DOES:
${i.desc}

REQUIRED STACK:
- Swift 5.9 + SwiftUI, MVVM, Combine for state
- SwiftData (or Core Data fallback for iOS 16) for local persistence
- StoreKit 2 for the one-time unlock (no subscriptions)
- Supabase Swift SDK for any cloud sync (auth-with-Apple, RLS on every table). Do NOT use Lovable Cloud — use Supabase directly with URL + anon key from a Config.plist.
- Sign in with Apple as the primary auth method
- Push: APNs via Supabase Edge Function relay (only if the app needs alerts)
- Offline-first: every read works without network

DELIVERABLES (in this exact order, one chunk at a time — do not skip ahead):
PART 1: Xcode project skeleton, Info.plist (privacy strings for camera/location/etc. only if needed), Config.plist with SUPABASE_URL + SUPABASE_ANON_KEY placeholders, App entry, root TabView/NavigationStack.
PART 2: Data models + SwiftData schema + Supabase table SQL (with RLS policies + GRANT statements).
PART 3: Main feature screens (list, detail, create/edit) wired to local store first, then Supabase sync.
PART 4: StoreKit 2 paywall — locked features show paywall sheet, restore purchases button, receipt validation.
PART 5: Settings screen (account, sign out, delete account, export data as JSON/CSV, privacy policy link).
PART 6: App Store assets checklist — 6.7" + 6.1" screenshots, icon 1024x1024, description copy, keywords, privacy nutrition label answers.
PART 7: EAS-free build instructions for a no-Mac workflow using EAS Cloud Build OR Xcode Cloud, plus TestFlight upload steps.

RULES:
- Stop and wait after each PART. Do not leave TODO placeholders. Do not invent API keys.
- Match Apple HIG: SF Symbols, system fonts, Dynamic Type, dark mode, VoiceOver labels on every interactive element.
- All Stripe is BANNED for digital unlocks on iOS — StoreKit 2 only. Physical goods may use Stripe SDK if the app sells anything physical.
- Privacy: no third-party trackers, no analytics that send PII. App Tracking Transparency only if you actually track across apps (you don't).

Start with PART 1 now.`;
}

function buildWebPrompt(i: Idea) {
  const slug = slugForWeb(i.pkg);
  return `You are an expert full-stack web engineer using Lovable. Build a production-ready web app.

APP NAME: ${i.name}
ROUTE SLUG: /${slug}
ONE-TIME PRICE (if monetized): $${i.price.toFixed(2)} via Stripe Checkout (one-time payment, not subscription)

WHAT IT DOES:
${i.desc}

REQUIRED STACK (NON-NEGOTIABLE):
- React 18 + Vite + TypeScript + Tailwind v3 + shadcn/ui (already the Lovable default)
- BACKEND: Supabase (NOT Lovable Cloud). Connect the external Supabase project — the user prefers Supabase directly because they know the dashboard, SQL editor, and edge function logs. If the workspace defaults to Lovable Cloud, ask the user to swap to a Supabase connection before writing any backend code.
- Auth: Supabase Auth with email/password + Google OAuth (popup, NOT full-page redirect)
- Database: Postgres with RLS on every table. Every CREATE TABLE must be followed by GRANT statements in the same migration. Roles stored in a separate user_roles table with a has_role() SECURITY DEFINER function — never on the profiles table.
- Edge Functions: Deno, esm.sh imports, CORS headers on every response
- Payments: Stripe Checkout via an edge function (web is allowed to use Stripe for digital goods)
- SEO: react-helmet-async, semantic HTML, JSON-LD, single H1, meta description < 160 chars, canonical tags, sitemap.xml entry

DELIVERABLES (one PART at a time, stop and wait between each):
PART 1: Route + page skeleton, design tokens in index.css (HSL semantic tokens — no hardcoded colors), responsive layout, SEO head.
PART 2: Supabase migration SQL — tables, RLS policies, GRANT statements, indexes, triggers. Paste the full SQL.
PART 3: Data hooks (useQuery + useMutation via @tanstack/react-query), Supabase client wiring, optimistic updates.
PART 4: Main UI — list/detail/create/edit screens using shadcn components, toast feedback, loading + empty + error states.
PART 5: Auth gate, profile management, sign-out, account deletion edge function.
PART 6: Stripe one-time checkout edge function + success/cancel routes + webhook handler that flips an unlock row.
PART 7: Mobile polish — overflow-x-auto no-scrollbar on horizontal lists, 44px tap targets, no layout shift.
PART 8: Cross-platform sync note — list every table + edge function so the iOS and Android clones can read/write the same Supabase project.

RULES:
- No hardcoded color utilities (no text-white, no bg-[#...]). Use semantic tokens from index.css.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
- Never store secrets in database tables — use Supabase edge function secrets.
- One H1 per page. Alt text on every image. Lazy-load below the fold.
- Stop after each PART. No TODOs, no placeholders.

Start with PART 1 now.`;
}

export default function PlatformIdeaList({ platform }: { platform: Platform }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return IDEAS;
    return IDEAS.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.desc.toLowerCase().includes(needle) ||
        i.pkg.toLowerCase().includes(needle),
    );
  }, [q]);

  const isIOS = platform === "ios";
  const Icon = isIOS ? Apple : Globe;
  const title = isIOS ? "iOS App Ideas" : "Website Ideas";
  const subtitle = isIOS
    ? "Same 150 concepts as Android — rewritten for native Swift/SwiftUI + StoreKit 2. Copy a part-by-part prompt for Xcode/Cursor/Claude."
    : "Same 150 concepts as Android — rewritten as Lovable web prompts. Every prompt forces Supabase (not Lovable Cloud) per your preference.";

  const build = isIOS ? buildIOSPrompt : buildWebPrompt;
  const platformBadge = isIOS ? "iOS" : "Web";

  const copy = async (i: Idea) => {
    await navigator.clipboard.writeText(build(i));
    toast({ title: "Prompt copied", description: `${platformBadge} prompt for ${i.name}` });
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
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search 150 ideas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filtered.length} of {IDEAS.length}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((i) => (
              <Card key={i.pkg} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{i.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      ${i.price.toFixed(2)}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono break-all">
                    {isIOS ? bundleIdForIOS(i.pkg) : `/${slugForWeb(i.pkg)}`}
                  </CardDescription>
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
                    Copy {platformBadge} prompt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
