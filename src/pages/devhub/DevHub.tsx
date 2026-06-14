import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Cpu, Code2, Flame, DollarSign, Activity, BookLock, Bot, Wrench, Boxes, Rocket, Keyboard, Hammer, PiggyBank, Sparkles, Smartphone, Database, Apple, Image as ImageIcon, ArrowRightLeft, Megaphone, Music2, ClipboardList, Globe, Bug, Repeat, Cloud, Wine, Layout, GraduationCap, Zap, Mail, Chrome, Tv
} from "lucide-react";

const modules = [
  { to: "/devhub/server-console", icon: Terminal, title: "Server AI Console", desc: "Send commands to your home server, watch live events from pc_events.", tag: "Server + AI Ops" },
  { to: "/devhub/server-health", icon: Activity, title: "Server Health & Self-Repair", desc: "CPU/RAM/disk + AI diagnoser that proposes fixes for Docker containers.", tag: "Server + AI Ops" },
  { to: "/devhub/vault", icon: BookLock, title: "Knowledge Vault", desc: "Private notes (family, contacts, history) CriderGPT can reference.", tag: "Server + AI Ops" },
  { to: "/devhub/machine-designer", icon: Cpu, title: "Autonomous Machine Designer", desc: "Describe a robot/task → AI drafts parts list, wiring, control loop, firmware.", tag: "Builder" },
  { to: "/devhub/code-generator", icon: Code2, title: "App & Site Code Generator", desc: "Generate Android (Kotlin), iOS (Swift), or Web (React) starter projects.", tag: "Builder" },
  { to: "/devhub/agent-dispatcher", icon: Bot, title: "AGI Agent Dispatcher", desc: "Fire off background agents to research, scaffold, or refactor.", tag: "Builder" },
  { to: "/devhub/autopilot", icon: Rocket, title: "Autopilot Queue", desc: "Queue dev tasks. Runner drains them every 2 min. Live status board.", tag: "Builder" },
  { to: "/devhub/laser-studio", icon: Flame, title: "Laser Engraver Studio", desc: "SVG/PNG → G-code with power/speed presets for your engraver.", tag: "Shop + Money" },
  { to: "/devhub/income", icon: DollarSign, title: "Income & Business Calculator", desc: "Welding ($25/hr × 14h × 7d = $2,450/wk) + ad/IAP/Stripe rollup + tax est.", tag: "Shop + Money" },
  { to: "/devhub/weld-jobs", icon: Wrench, title: "Welding Job Tracker", desc: "Clock hours at the shop, log jobs, export weekly timesheet.", tag: "Shop + Money" },
  { to: "/devhub/mod-packer", icon: Boxes, title: "FS25 / FS22 Mod Packer", desc: "Unpack a mod ZIP, edit XML, repack signed. Hooks into process-mod-zip.", tag: "Builder" },
  { to: "/devhub/keyboard-blueprint", icon: Keyboard, title: "Project AETHER", desc: "Concept blueprint for a futuristic transparent wireless keyboard with per-key lighting.", tag: "Builder" },
  { to: "/devhub/android-builder", icon: Hammer, title: "Android Auto-Builder", desc: "One-shot Ubuntu install commands + dashboard. Builds a signed APK + AAB every time you press Update.", tag: "Server + AI Ops" },
  { to: "/devhub/money-split", icon: PiggyBank, title: "Money Split Calculator", desc: "Drop your paycheck in, set % for CriderGPT, emergency, fun, and savings. See where every dollar goes.", tag: "Shop + Money" },
  { to: "/devhub/aether", icon: Sparkles, title: "AETHER Control Panel", desc: "Design key layouts, tune haptic + trackpad, push live to the glass keyboard.", tag: "Builder" },
  { to: "/devhub/android-app-ideas", icon: Smartphone, title: "Android App Ideas", desc: "150 one-time-purchase app concepts. Copy a ready-to-paste Gemini/Android Studio prompt with app name + package id.", tag: "Builder" },
  { to: "/devhub/backend-blueprints", icon: Database, title: "Backend Blueprints", desc: "Copy-paste SQL + secrets + edge function checklists for client apps (Him & Her Boutique, etc).", tag: "Builder" },
  { to: "/devhub/ios-builder", icon: Apple, title: "iOS Builder", desc: "No-Mac signed .ipa via EAS Cloud Build. Generates eas.json, app.json, submit commands.", tag: "iOS" },
  { to: "/devhub/ios-asset-studio", icon: ImageIcon, title: "iOS Asset Studio", desc: "One source image → all 17 iOS icon sizes, Android mipmaps, App Store screenshot template. ZIP download.", tag: "iOS" },
  { to: "/devhub/swift-code-generator", icon: Code2, title: "Swift Code Generator", desc: "Unified cross-platform: type a feature, get Kotlin + Compose and Swift + SwiftUI side-by-side.", tag: "iOS" },
  
  { to: "/devhub/native-rebuild-prompt", icon: Rocket, title: "CriderGPT Full-Native Rebuild Prompt", desc: "One giant master prompt: Android (Kotlin) + iOS (Swift) + Desktop (Tauri). All 60+ features, same Supabase. Copy/paste into Cursor or Claude Code.", tag: "Builder" },
  { to: "/devhub/admob-addon-prompt", icon: Megaphone, title: "AdMob Add-On Prompt", desc: "Scope-limited prompt: wire AdMob rewarded, interstitial, and banner into an existing native app. Subscription-gated. Copy/paste ready.", tag: "Builder" },
  { to: "/devhub/marketing-auto-post", icon: Music2, title: "TikTok Marketing Auto-Post", desc: "Auto-queues a TikTok post when a new store product, SEO guide, or your livestock is added. Live queue, manual posts, runs every 15 min.", tag: "Shop + Money" },
  { to: "/devhub/android-agent-prompts", icon: ClipboardList, title: "Android Agent Prompts", desc: "Section-by-section prompts (Part 1, 2, 3...) for the Android Studio AI agent. Copy one block at a time so it doesn't get overwhelmed and leave placeholders. Add your own.", tag: "Builder" },
  { to: "/devhub/ios-app-ideas", icon: Apple, title: "iOS App Ideas", desc: "Same 150 concepts as Android, rewritten for native Swift/SwiftUI + StoreKit 2 unlocks. Copy a Xcode/Cursor-ready prompt per idea.", tag: "iOS" },
  { to: "/devhub/website-ideas", icon: Globe, title: "Website Ideas (Lovable)", desc: "Same 150 concepts rewritten as Lovable web prompts. Forces Supabase (not Lovable Cloud) per your preference. Copy and paste straight into a new Lovable project.", tag: "Builder" },
  { to: "/devhub/cross-platform-release-notes", icon: ArrowRightLeft, title: "Cross-Platform Release Notes", desc: "Web vs iOS vs Android side-by-side for the current version, plus an editable feature parity matrix. One click copies a full report.", tag: "Builder" },
  { to: "/devhub/native-debug-notes", icon: Bug, title: "Native App Debug Notes", desc: "Log iOS/Android bugs you see in the live app (drawer overlay, Google sign-in error, NFC button on iPhone, etc.). Severity + status + copy-as-markdown report.", tag: "iOS" },
  { to: "/devhub/ios-resume-prompt", icon: Apple, title: "iOS Migration Resume Prompt", desc: "Stop Gemini from re-doing finished work on the iOS port. Pin Auth/Shell/Data/Features/IAP % per phase, list what's done + what's left, copy a strict resume prompt with anti-loop guards.", tag: "iOS" },
  { to: "/devhub/subscription-ideas-android", icon: Repeat, title: "1,000 Android Subscription Ideas", desc: "Recurring-revenue companion concepts to the 150 one-time Android apps. Filter by category + tier, copy a Kotlin/Compose + Play Billing prompt per idea.", tag: "Builder" },
  { to: "/devhub/subscription-ideas-ios", icon: Repeat, title: "1,000 iOS Subscription Ideas", desc: "Same 1,000 ideas rewritten for native Swift/SwiftUI + StoreKit 2 auto-renewing subscriptions.", tag: "iOS" },
  { to: "/devhub/subscription-ideas-web", icon: Repeat, title: "1,000 Web Subscription Ideas", desc: "Same 1,000 ideas as Lovable web prompts with Stripe Subscriptions (monthly + yearly) and Supabase RLS.", tag: "Builder" },
  { to: "/devhub/backend-wiring", icon: Cloud, title: "Backend Wiring Reference", desc: "Full list of every Supabase edge function + table grouped by purpose, with credentials block and a ready-to-paste native wiring prompt so Gemini/Cursor doesn't recreate what already exists.", tag: "Server + AI Ops" },
  { to: "/devhub/ui-blueprints", icon: Layout, title: "UI Blueprints", desc: "Per-screen Compose / SwiftUI / React blueprints with ADD-ONLY file paths and anti-delete guards so Gemini stops trying to wipe app/src/main. Includes an SVG wireframe.", tag: "Builder" },
  { to: "/devhub/alcohol-recipes", icon: Wine, title: "Alcohol Recipe Lab", desc: "Owner-only wine, cocktail, homebrew, and food-pairing generator. 21+. Drink responsibly.", tag: "Shop + Money" },
  { to: "/devhub/tech-library", icon: GraduationCap, title: "Tech Knowledge Library", desc: "Long-form, plain-English deep dives: Google Sign-In Web vs Android client IDs + SHA-1, button-click-to-DB pipeline, edge functions, Play Billing, keystores, RLS, deep links, Realtime, RAG. Searchable, filterable by track.", tag: "Server + AI Ops" },
  { to: "/devhub/auto-promo", icon: Zap, title: "Auto-Promo System (Hourly)", desc: "Owner-only hourly TikTok auto-poster. Rotates your promo video library, AI-generates fresh caption + hashtags every hour, 7-day dedup, hourly cap + min-gap guardrails, kill switch.", tag: "Shop + Money" },
  { to: "/devhub/email-test", icon: Mail, title: "Email Test", desc: "Owner-only. Send a real no-reply email via notify.cridergpt.com to verify templates + queue end-to-end.", tag: "Server + AI Ops" },
  { to: "/devhub/chrome-extensions", icon: Chrome, title: "Chrome Extension Studio", desc: "No-code templates, monetization tips, and every link you need to publish + sell Chrome/Edge/Firefox extensions.", tag: "Shop + Money" },
];

export default function DevHub() {
  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Crider Dev Hub</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Owner-only command center. Build, ship, repair — everything in one place.
                </p>
              </div>
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                Verified Owner Access
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.to} to={m.to} className="group">
                  <Card className="h-full hover:border-primary/60 transition-colors hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">{m.tag}</Badge>
                      </div>
                      <CardTitle className="text-base mt-3">{m.title}</CardTitle>
                      <CardDescription className="text-xs">{m.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
