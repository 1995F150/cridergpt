import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Apple, Copy, Download, Rocket } from "lucide-react";
import { toast } from "sonner";

export default function IOSBuilder() {
  const [appName, setAppName] = useState("CriderGPT");
  const [bundleId, setBundleId] = useState("app.cridergpt.ios");
  const [version, setVersion] = useState("1.0.0");
  const [teamId, setTeamId] = useState("");
  const [easProjectId, setEasProjectId] = useState("");

  const easJson = JSON.stringify({
    cli: { version: ">= 5.0.0", appVersionSource: "remote" },
    build: {
      development: { developmentClient: true, distribution: "internal", ios: { simulator: true } },
      preview: { distribution: "internal", ios: { resourceClass: "m-medium" } },
      production: { ios: { resourceClass: "m-medium", autoIncrement: true } },
    },
    submit: {
      production: {
        ios: {
          appleId: "your-apple-id@email.com",
          ascAppId: "1234567890",
          appleTeamId: teamId || "XXXXXXXXXX",
        },
      },
    },
  }, null, 2);

  const appJson = JSON.stringify({
    expo: {
      name: appName,
      slug: appName.toLowerCase().replace(/\s+/g, "-"),
      version,
      ios: {
        bundleIdentifier: bundleId,
        buildNumber: "1",
        supportsTablet: true,
        infoPlist: {
          NSCameraUsageDescription: "Scan livestock NFC tags and photograph animals",
          NSMicrophoneUsageDescription: "Voice input for CriderGPT chat",
          NSPhotoLibraryUsageDescription: "Attach photos to listings and chats",
          NSLocationWhenInUseUsageDescription: "Weather + farm sensor context",
          NFCReaderUsageDescription: "Read CriderGPT livestock tags",
        },
      },
      extra: { eas: { projectId: easProjectId || "PASTE-EAS-PROJECT-ID" } },
    },
  }, null, 2);

  const commands = `# 1) one-time setup on any machine (no Mac required)
npm i -g eas-cli
eas login
eas init --id ${easProjectId || "<paste-after-init>"}

# 2) build a signed .ipa on EAS cloud Macs
eas build --platform ios --profile production

# 3) submit to App Store Connect / TestFlight
eas submit --platform ios --latest`;

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const downloadAll = () => {
    const blob = new Blob(
      [`# ${appName} — iOS Build Bundle\n\n## eas.json\n\`\`\`json\n${easJson}\n\`\`\`\n\n## app.json\n\`\`\`json\n${appJson}\n\`\`\`\n\n## Commands\n\`\`\`bash\n${commands}\n\`\`\`\n`],
      { type: "text/markdown" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName}-ios-bundle.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DevHubPage title="iOS Builder" subtitle="No-Mac signed .ipa via EAS Cloud Build">
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Apple className="w-4 h-4" /> App config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>App name</Label><Input value={appName} onChange={e => setAppName(e.target.value)} /></div>
            <div><Label>Bundle ID</Label><Input value={bundleId} onChange={e => setBundleId(e.target.value)} placeholder="app.you.appname" /></div>
            <div><Label>Version</Label><Input value={version} onChange={e => setVersion(e.target.value)} /></div>
            <div><Label>Apple Team ID</Label><Input value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="XXXXXXXXXX" /></div>
            <div><Label>EAS Project ID</Label><Input value={easProjectId} onChange={e => setEasProjectId(e.target.value)} placeholder="run eas init first" /></div>
            <Button onClick={downloadAll} className="w-full"><Download className="w-4 h-4 mr-2" />Download bundle (.md)</Button>
            <Badge variant="outline" className="w-full justify-center">Pipeline: EAS Cloud Build</Badge>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">eas.json</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("eas.json", easJson)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={easJson} className="font-mono text-xs h-56" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">app.json (Expo + Capacitor compatible)</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("app.json", appJson)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={appJson} className="font-mono text-xs h-64" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Rocket className="w-4 h-4" />Build & submit</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("commands", commands)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={commands} className="font-mono text-xs h-40" /></CardContent>
          </Card>
        </div>
      </div>
    </DevHubPage>
  );
}
