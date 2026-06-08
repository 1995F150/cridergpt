import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, DollarSign, Star } from "lucide-react";

type AdNet = {
  name: string;
  url: string;
  formats: string[];
  bestFor: string;
  payout: string;
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5;
  priority: "Start here" | "Add later" | "Optional";
};

const NETWORKS: AdNet[] = [
  {
    name: "Google AdMob",
    url: "https://admob.google.com/",
    formats: ["Banner", "Interstitial", "Rewarded Video", "Native"],
    bestFor: "First ad network for every app. Highest fill rates in US/ag/edu.",
    payout: "Net-60, $100 min payout (direct deposit)",
    notes: "Sign up with the same Google account as your Play Console. Rewarded video (\"watch ad for +5 free messages\") is your money maker. Pre-staged in this project — just drop in the App ID.",
    rating: 5,
    priority: "Start here",
  },
  {
    name: "AppLovin MAX",
    url: "https://www.applovin.com/max/",
    formats: ["Mediation (runs all networks)", "Banner", "Interstitial", "Rewarded"],
    bestFor: "Once you hit ~500 DAU. Mediation = networks bid against each other for every ad slot.",
    payout: "Net-30, $100 min",
    notes: "Single SDK that runs AdMob + Unity + Meta + Mintegral simultaneously. Higher eCPM than AdMob alone. Slightly more setup. Use this when you're serious about revenue.",
    rating: 5,
    priority: "Add later",
  },
  {
    name: "Unity Ads (Unity LevelPlay)",
    url: "https://unity.com/products/unity-ads",
    formats: ["Rewarded Video", "Interstitial", "Banner"],
    bestFor: "Excellent rewarded video eCPM. Great fallback inside MAX mediation.",
    payout: "Net-60, $200 min",
    notes: "Merged with ironSource. Strong in gaming-adjacent and utility apps. Add as a secondary network inside AppLovin MAX.",
    rating: 4,
    priority: "Add later",
  },
  {
    name: "Meta Audience Network",
    url: "https://www.facebook.com/audiencenetwork/",
    formats: ["Banner", "Interstitial", "Native", "Rewarded"],
    bestFor: "Backup network inside mediation. Solid eCPM when fill is available.",
    payout: "Net-30, $100 min",
    notes: "Meta has been trimming this network. Still worth plugging into MAX as a fallback. Requires Facebook Business account.",
    rating: 3,
    priority: "Optional",
  },
  {
    name: "Mintegral",
    url: "https://www.mintegral.com/",
    formats: ["Rewarded Video", "Playable Ads", "Interstitial"],
    bestFor: "Rising network. Strong in non-gaming utility apps.",
    payout: "Net-60, $100 min",
    notes: "Good rewarded fill rates. Add inside MAX mediation. Chinese company — review their data policy if your app targets EU users (GDPR).",
    rating: 4,
    priority: "Optional",
  },
  {
    name: "Chartboost",
    url: "https://www.chartboost.com/",
    formats: ["Interstitial", "Rewarded Video"],
    bestFor: "Game-like apps and gamified utilities.",
    payout: "Net-60, $200 min",
    notes: "Owned by Zynga. Best if your app has any game mechanics (streaks, leaderboards, rewards).",
    rating: 3,
    priority: "Optional",
  },
];

const SETUP_STEPS = [
  {
    step: "1",
    title: "Sign up for AdMob",
    body: "Use the same Google account as your Play Console. Verify your address (postcard takes ~2 weeks). Add your bank for direct deposit.",
  },
  {
    step: "2",
    title: "Create an app + ad units",
    body: "In AdMob console: Apps → Add App → link to your Play Store listing. Create at least one Rewarded Video unit and one Interstitial unit. Copy the App ID and Unit IDs.",
  },
  {
    step: "3",
    title: "Add the AdMob plugin",
    body: "For Capacitor: npm i @capacitor-community/admob then npx cap sync. For FlutterFlow: enable AdMob in Settings → Integrations. For Rork: paste your App ID in the project settings.",
  },
  {
    step: "4",
    title: "Test with test ad units first",
    body: "ALWAYS use Google's test ad unit IDs during development. Clicking your own real ads = instant ban. Swap to real IDs only in production builds.",
  },
  {
    step: "5",
    title: "Add app-ads.txt to your domain",
    body: "Required by AdMob to prove you own the app. Host the file at cridergpt.com/app-ads.txt and declare it in your Play Console listing.",
  },
  {
    step: "6",
    title: "Wait for 500 DAU, then add MAX",
    body: "Once you have consistent traffic, sign up for AppLovin MAX, plug AdMob + Unity + Meta into it. Expect 20–40% eCPM lift.",
  },
];

const POLICY_RULES = [
  "Never click your own ads — instant permanent ban.",
  "No ads in paid apps. If a user paid $0.99–$100 for your app, no ads inside.",
  "Ads inside CriderGPT free tier are fine, but Pro/Lifetime users must see zero ads.",
  "Show rewarded ads with a clear button (\"Watch ad for +5 messages\"). Never autoplay rewarded.",
  "Don't put interstitials between every screen — Google will throttle your fill rate.",
  "COPPA: If kids could use the app, mark it as such in AdMob. Use only child-safe ad networks.",
];

export default function AdNetworks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Ad Networks for Android & iOS Apps — DevHub</title>
        <meta
          name="description"
          content="Best ad networks to monetize Android and iOS apps: AdMob, AppLovin MAX, Unity, Meta, Mintegral. Setup steps, payout terms, and policy rules."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/devhub/android-app-ideas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App Ideas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/devhub/builder-resources">Builder Tools →</Link>
          </Button>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Ad Networks for Monetization
          </h1>
          <p className="text-muted-foreground">
            Ad SDKs you can drop into your Android / iOS apps. Start with AdMob solo, then add AppLovin MAX mediation once you have traffic.
          </p>
        </header>

        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">My recommendation for you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Launch:</strong> AdMob only. Rewarded video for "watch ad for +5 free messages" + one interstitial after every 3rd chat session.
            </p>
            <p>
              <strong>~500 DAU:</strong> Add AppLovin MAX mediation. Plug AdMob, Unity, Meta into it.
            </p>
            <p>
              <strong>Never:</strong> Put ads in your paid utility apps ($0.99–$100). Users paid upfront — ads will tank your reviews.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {NETWORKS.map((n) => (
            <Card key={n.name} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{n.name}</CardTitle>
                  <Badge
                    variant={
                      n.priority === "Start here"
                        ? "default"
                        : n.priority === "Add later"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {n.priority}
                  </Badge>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < n.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {n.formats.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Best for</div>
                  <p>{n.bestFor}</p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Payout</div>
                  <p>{n.payout}</p>
                </div>
                <p className="text-muted-foreground text-xs">{n.notes}</p>
                <Button variant="outline" size="sm" className="mt-auto" asChild>
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    Visit <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AdMob setup — step by step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SETUP_STEPS.map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {s.step}
                </div>
                <div>
                  <div className="font-medium text-sm">{s.title}</div>
                  <p className="text-xs text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Policy rules — break these and you get banned</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {POLICY_RULES.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-destructive">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
