import { useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Globe, Apple, Smartphone, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION, VERSION_NAME, RELEASE_DATE, VERSION_FEATURES } from "@/config/appVersion";

type Row = { feature: string; web: "yes" | "no" | "partial"; ios: "yes" | "no" | "partial"; android: "yes" | "no" | "partial" };

const DEFAULT_PARITY: Row[] = [
  { feature: "Chat (CriderGPT core)",          web: "yes", ios: "partial", android: "yes" },
  { feature: "Livestock Smart ID + NFC scan",  web: "partial", ios: "partial", android: "yes" },
  { feature: "Voice / Call Mode",              web: "yes", ios: "no", android: "yes" },
  { feature: "AGI Mode + tool calling",        web: "yes", ios: "no", android: "partial" },
  { feature: "Store + Stripe checkout",        web: "yes", ios: "no", android: "no" },
  { feature: "Plus/Pro subscription",          web: "yes (Stripe)", ios: "no (StoreKit todo)", android: "yes (Play Billing)" } as unknown as Row,
  { feature: "Snapchat / TikTok integrations", web: "yes", ios: "no", android: "partial" },
  { feature: "USB / Serial hardware",          web: "yes", ios: "no", android: "partial" },
  { feature: "Sensor context (GPS, weather)",  web: "partial", ios: "no", android: "yes" },
  { feature: "Offline mode",                   web: "partial", ios: "no", android: "yes" },
];

function statusBadge(v: string) {
  const tone =
    v.startsWith("yes") ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
    : v.startsWith("partial") ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-rose-500/10 text-rose-600 border-rose-500/30";
  return <Badge variant="outline" className={`text-[10px] ${tone}`}>{v}</Badge>;
}

export default function CrossPlatformReleaseNotes() {
  const { toast } = useToast();
  const [webNotes, setWebNotes] = useState(VERSION_FEATURES.join("\n"));
  const [iosNotes, setIosNotes] = useState("• Coming soon — StoreKit 2 paywall in progress\n• Sign in with Apple wired\n• Livestock NFC pending Core NFC integration");
  const [androidNotes, setAndroidNotes] = useState("• Google Play Billing live (cridergpt_plus_monthly, cridergpt_pro_monthly)\n• Native NFC scan-only workflow\n• Chrome Custom Tabs OAuth (no SHA-1/Firebase)");

  const fullReport = () => {
    const lines = [
      `# CriderGPT v${APP_VERSION} — ${VERSION_NAME}`,
      `Released: ${RELEASE_DATE}`,
      ``,
      `## Web (cridergpt.com)`,
      webNotes,
      ``,
      `## iOS (app.cridergpt.android — iOS bundle TBD)`,
      iosNotes,
      ``,
      `## Android (app.cridergpt.android)`,
      androidNotes,
      ``,
      `## Feature Parity`,
      ...DEFAULT_PARITY.map((r) => `- ${r.feature}: web=${r.web}, ios=${r.ios}, android=${r.android}`),
    ];
    return lines.join("\n");
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(fullReport());
    toast({ title: "Cross-platform release notes copied" });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Cross-Platform Release Notes</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  v{APP_VERSION} · {VERSION_NAME} · {RELEASE_DATE} — side-by-side what shipped on each surface.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Web</CardTitle>
                </div>
                <CardDescription className="text-xs">cridergpt.com</CardDescription>
              </CardHeader>
              <CardContent>
                <Label className="text-xs">Release notes</Label>
                <Textarea
                  value={webNotes}
                  onChange={(e) => setWebNotes(e.target.value)}
                  className="mt-1 h-48 font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Apple className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">iOS</CardTitle>
                </div>
                <CardDescription className="text-xs">App Store (pending submission)</CardDescription>
              </CardHeader>
              <CardContent>
                <Label className="text-xs">Release notes</Label>
                <Textarea
                  value={iosNotes}
                  onChange={(e) => setIosNotes(e.target.value)}
                  className="mt-1 h-48 font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Android</CardTitle>
                </div>
                <CardDescription className="text-xs">app.cridergpt.android</CardDescription>
              </CardHeader>
              <CardContent>
                <Label className="text-xs">Release notes</Label>
                <Textarea
                  value={androidNotes}
                  onChange={(e) => setAndroidNotes(e.target.value)}
                  className="mt-1 h-48 font-mono text-xs"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature parity matrix</CardTitle>
              <CardDescription className="text-xs">
                Quick "what's missing where" — edit DEFAULT_PARITY in the file as features ship.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 pr-4">Feature</th>
                    <th className="py-2 px-2">Web</th>
                    <th className="py-2 px-2">iOS</th>
                    <th className="py-2 px-2">Android</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_PARITY.map((r) => (
                    <tr key={r.feature} className="border-b border-border/50">
                      <td className="py-2 pr-4">{r.feature}</td>
                      <td className="py-2 px-2">{statusBadge(String(r.web))}</td>
                      <td className="py-2 px-2">{statusBadge(String(r.ios))}</td>
                      <td className="py-2 px-2">{statusBadge(String(r.android))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={copyAll}>
              <Copy className="w-4 h-4 mr-2" />
              Copy full cross-platform report
            </Button>
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
