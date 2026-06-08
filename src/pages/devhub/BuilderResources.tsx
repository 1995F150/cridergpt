import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink } from "lucide-react";

type Tool = {
  name: string;
  url: string;
  pricing: string;
  outputs: string[];
  bestFor: string;
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5;
};

const TOOLS: Tool[] = [
  {
    name: "Rork",
    url: "https://rork.com",
    pricing: "Free trial, ~$20/mo",
    outputs: ["iOS", "Android", "React Native/Expo"],
    bestFor: "Simple paid utility apps (stand pickers, calculators, timers, GPS loggers)",
    notes: "Prompt-only. Generates Expo projects and can publish to TestFlight + Play directly. Fastest path to a $1–$10 utility app on both stores.",
    rating: 5,
  },
  {
    name: "FlutterFlow",
    url: "https://flutterflow.io",
    pricing: "Free / $30+/mo",
    outputs: ["iOS", "Android", "Web", "Flutter"],
    bestFor: "Apps that need a real backend (Supabase, Firebase), auth, dashboards, multi-screen flows",
    notes: "True native Flutter output. First-class Supabase integration. Visual builder + custom Dart code. Best when the app talks to your CriderGPT database.",
    rating: 5,
  },
  {
    name: "Android Studio + Gemini",
    url: "https://developer.android.com/studio",
    pricing: "Free",
    outputs: ["Android (Kotlin/Java)"],
    bestFor: "Apps that need NFC, USB/Serial, Bluetooth, background services, system intents",
    notes: "Full Kotlin control. Use this when the app touches hardware (livestock tag scanners, sensor hubs) or runs as a voice assistant.",
    rating: 5,
  },
  {
    name: "Bolt.new",
    url: "https://bolt.new",
    pricing: "Free / $20+/mo",
    outputs: ["Web", "React Native/Expo (beta)"],
    bestFor: "Quick web prototypes and Expo mobile MVPs",
    notes: "Browser-based, very fast. Good for testing an idea before committing to Rork or FlutterFlow.",
    rating: 4,
  },
  {
    name: "Lovable",
    url: "https://lovable.dev",
    pricing: "Free / $25+/mo",
    outputs: ["Web (React + Vite)", "Capacitor wrap"],
    bestFor: "Web apps, PWAs, dashboards, anything you want to also ship as a website",
    notes: "What you are using now. Best for the main CriderGPT platform and anything web-first that you also wrap for Android via Capacitor.",
    rating: 5,
  },
  {
    name: "Replit Agent",
    url: "https://replit.com",
    pricing: "Free / $25+/mo",
    outputs: ["Web", "Python", "Node servers"],
    bestFor: "Backend services, scripts, scrapers, Discord bots, hosted APIs",
    notes: "Best for the server-side glue that supports your apps (cron jobs, webhook receivers).",
    rating: 4,
  },
  {
    name: "Expo (manual)",
    url: "https://expo.dev",
    pricing: "Free / EAS paid tiers",
    outputs: ["iOS", "Android"],
    bestFor: "Building React Native apps without a Mac via EAS Cloud Build",
    notes: "Use directly when you outgrow Rork but want to keep React Native. EAS handles iOS signing for you.",
    rating: 4,
  },
  {
    name: "Glide",
    url: "https://glideapps.com",
    pricing: "Free / $25+/mo",
    outputs: ["PWA", "Android wrap"],
    bestFor: "Spreadsheet-backed internal tools (chapter rosters, livestock lists)",
    notes: "Fast for data-heavy CRUD apps. Limited for anything custom or hardware-driven.",
    rating: 3,
  },
  {
    name: "Adalo",
    url: "https://adalo.com",
    pricing: "Free / $36+/mo",
    outputs: ["iOS", "Android", "Web"],
    bestFor: "Simple branded mobile apps with no code",
    notes: "Easy but slower runtime. Fine for low-volume utility apps; not great for anything performance-sensitive.",
    rating: 3,
  },
  {
    name: "Thunkable",
    url: "https://thunkable.com",
    pricing: "Free / $13+/mo",
    outputs: ["iOS", "Android"],
    bestFor: "Drag-and-drop mobile apps, kid/student projects",
    notes: "Lowest learning curve. Good for prototypes; ship paid apps with Rork or FlutterFlow instead.",
    rating: 2,
  },
];

const RECOMMENDATIONS: { type: string; pick: string; why: string }[] = [
  { type: "Simple utility ($1–$5: timers, calculators, pickers)", pick: "Rork", why: "Prompt → both stores in a day." },
  { type: "GPS / location logger with history", pick: "FlutterFlow + Supabase", why: "Needs backend storage and auth." },
  { type: "NFC / Bluetooth / USB hardware app", pick: "Android Studio (Kotlin)", why: "Only native gives full hardware access." },
  { type: "Livestock / FFA management ($20–$100)", pick: "FlutterFlow + Supabase", why: "Multi-screen, auth, syncs to CriderGPT DB." },
  { type: "Web dashboard / admin tool", pick: "Lovable", why: "Already your stack; ships as PWA + Capacitor." },
  { type: "Voice assistant / system-level Android", pick: "Android Studio", why: "VoiceInteractionService needs native." },
  { type: "Internal data app from a spreadsheet", pick: "Glide", why: "Fastest spreadsheet → app path." },
  { type: "Quick MVP to test an idea", pick: "Bolt.new or Rork", why: "Free tier, working build in minutes." },
];

function Stars({ n }: { n: number }) {
  return <span className="text-amber-400">{"★".repeat(n)}<span className="text-muted-foreground">{"★".repeat(5 - n)}</span></span>;
}

export default function BuilderResources() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>App Builder Resources & Tools — CriderGPT Dev Hub</title>
        <meta name="description" content="Curated list of the best AI app builders (Rork, FlutterFlow, Android Studio, Lovable) with recommendations for each kind of app." />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/devhub/android-app-ideas">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> App Ideas</Button>
          </Link>
          <Badge variant="secondary">Dev Hub</Badge>
        </div>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Builder Resources & Tools</h1>
          <p className="text-muted-foreground">The websites I trust for building Android, iOS, and web apps — plus which one to grab for each kind of project.</p>
        </header>

        <Card>
          <CardHeader><CardTitle>Pick by app type</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {RECOMMENDATIONS.map((r) => (
              <div key={r.type} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex-1 text-sm">{r.type}</div>
                <div className="flex items-center gap-2">
                  <Badge>{r.pick}</Badge>
                  <span className="text-xs text-muted-foreground">{r.why}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          {TOOLS.map((t) => (
            <Card key={t.name} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Stars n={t.rating} />
                </div>
                <div className="text-xs text-muted-foreground">{t.pricing}</div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap gap-1">
                  {t.outputs.map((o) => <Badge key={o} variant="outline" className="text-xs">{o}</Badge>)}
                </div>
                <div className="text-sm"><span className="font-medium">Best for: </span>{t.bestFor}</div>
                <div className="text-xs text-muted-foreground">{t.notes}</div>
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="mt-auto">
                  <Button variant="outline" size="sm" className="w-full">
                    Open <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>My workflow</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>1. Brainstorm and price the idea in the <Link to="/devhub/android-app-ideas" className="text-primary underline">App Ideas</Link> page.</p>
            <p>2. Pick the builder from the table above based on what the app actually needs.</p>
            <p>3. Copy the generated prompt into that tool (Rork, FlutterFlow, Bolt).</p>
            <p>4. If it needs a backend, point it at the existing CriderGPT Supabase project so everything stays unified.</p>
            <p>5. Ship to Play Store via the self-hosted Android Builder, or to App Store via EAS Cloud Build.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
