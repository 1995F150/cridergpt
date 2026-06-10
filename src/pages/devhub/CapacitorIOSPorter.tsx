import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

// Map Android permission / Capacitor plugin -> iOS Info.plist key + description
const PERM_MAP: Record<string, { key: string; desc: string; note?: string }> = {
  "android.permission.CAMERA":              { key: "NSCameraUsageDescription",          desc: "Take photos for listings, livestock, and chat" },
  "android.permission.RECORD_AUDIO":        { key: "NSMicrophoneUsageDescription",      desc: "Voice input for CriderGPT and call mode" },
  "android.permission.ACCESS_FINE_LOCATION":{ key: "NSLocationWhenInUseUsageDescription", desc: "Weather, farm sensor, and event context" },
  "android.permission.ACCESS_COARSE_LOCATION":{ key: "NSLocationWhenInUseUsageDescription", desc: "Approximate location for weather" },
  "android.permission.READ_EXTERNAL_STORAGE":{ key: "NSPhotoLibraryUsageDescription",   desc: "Attach photos and files" },
  "android.permission.READ_MEDIA_IMAGES":   { key: "NSPhotoLibraryUsageDescription",    desc: "Attach photos" },
  "android.permission.NFC":                 { key: "NFCReaderUsageDescription",         desc: "Read CriderGPT livestock tags" },
  "android.permission.POST_NOTIFICATIONS":  { key: "_iOS_PushAuto",                     desc: "iOS handles push via UNUserNotificationCenter — no plist entry; request at runtime." , note: "Call UNUserNotificationCenter.requestAuthorization at runtime"},
  "android.permission.BLUETOOTH_CONNECT":   { key: "NSBluetoothAlwaysUsageDescription", desc: "Connect to USB/BLE livestock scanners" },
  "android.permission.BLUETOOTH_SCAN":      { key: "NSBluetoothAlwaysUsageDescription", desc: "Scan for nearby tag readers" },
  "android.permission.READ_CONTACTS":       { key: "NSContactsUsageDescription",        desc: "Invite friends and chapter members" },
  "android.permission.CALL_PHONE":          { key: "_iOS_OpenURL",                      desc: "iOS uses tel: URL scheme; no plist entry needed.", note: "Use UIApplication.shared.open(URL(string: \"tel:...\")!)" },
};

const PLUGIN_MAP: Record<string, { swift: string; pod?: string }> = {
  "@capacitor/camera":          { swift: "import Capacitor\n// Already iOS-ready. Confirm NSCameraUsageDescription + NSPhotoLibraryUsageDescription set." },
  "@capacitor/geolocation":     { swift: "// iOS-ready. Add NSLocationWhenInUseUsageDescription." },
  "@capacitor/push-notifications": { swift: "// Add Push Notifications capability in Xcode. Run on real device — simulator can't receive APNs." },
  "@capacitor/local-notifications": { swift: "// iOS-ready. No plist key required." },
  "@capacitor/filesystem":      { swift: "// iOS uses sandboxed Documents directory automatically." },
  "@capacitor/share":           { swift: "// iOS-ready via UIActivityViewController." },
  "@capacitor/browser":         { swift: "// iOS uses SFSafariViewController — popup OAuth works as-is." },
  "@capacitor/app":             { swift: "// Universal Links: configure associated domains entitlement + apple-app-site-association." },
  "@capacitor-community/nfc":   { swift: "// Add 'Near Field Communication Tag Reading' capability in Xcode. Add NFCReaderUsageDescription. iOS supports READ only for plain NDEF tags — your CriderGPT-XXXXXX text format works." },
  "cordova-plugin-purchase":    { swift: "// Replace with @capacitor-community/in-app-purchases or StoreKit 2 — Cordova plugin is deprecated." },
};

interface Result {
  plist: { key: string; desc: string }[];
  notes: string[];
  capabilities: string[];
  swiftStubs: string;
}

function analyze(manifest: string, pkg: string): Result {
  const perms = Array.from(manifest.matchAll(/android\.permission\.[A-Z_]+/g)).map(m => m[0]);
  const uniq = Array.from(new Set(perms));

  const plistMap = new Map<string, string>();
  const notes = new Set<string>();
  const caps = new Set<string>();

  for (const p of uniq) {
    const m = PERM_MAP[p];
    if (!m) { notes.add(`No iOS equivalent for ${p} — review manually.`); continue; }
    if (m.key.startsWith("_iOS_")) { notes.add(`${p}: ${m.note}`); continue; }
    if (!plistMap.has(m.key)) plistMap.set(m.key, m.desc);
  }

  let plugins: string[] = [];
  try {
    const j = JSON.parse(pkg || "{}");
    plugins = Object.keys({ ...(j.dependencies || {}), ...(j.devDependencies || {}) })
      .filter(k => k.startsWith("@capacitor/") || k.startsWith("@capacitor-community/") || k.startsWith("cordova-"));
  } catch { /* ignore */ }

  let swiftStubs = "// === Capacitor iOS port stubs ===\n\n";
  for (const plug of plugins) {
    const info = PLUGIN_MAP[plug];
    if (info) swiftStubs += `// ${plug}\n${info.swift}\n\n`;
    else swiftStubs += `// ${plug} — no mapping. Check plugin docs for iOS support.\n\n`;
  }

  // Capabilities to flip in Xcode
  if (manifest.includes("android.permission.NFC")) caps.add("Near Field Communication Tag Reading");
  if (plugins.includes("@capacitor/push-notifications")) caps.add("Push Notifications");
  if (manifest.includes("BIND_VOICE_INTERACTION") || manifest.includes("VoiceInteractionService")) caps.add("Siri (SiriKit Intents) — closest iOS analog");
  if (plugins.includes("@capacitor/app")) caps.add("Associated Domains (Universal Links)");

  return {
    plist: Array.from(plistMap.entries()).map(([key, desc]) => ({ key, desc })),
    notes: Array.from(notes),
    capabilities: Array.from(caps),
    swiftStubs,
  };
}

export default function CapacitorIOSPorter() {
  const [manifest, setManifest] = useState("");
  const [pkg, setPkg] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const run = () => {
    if (!manifest && !pkg) { toast.error("Paste AndroidManifest.xml and/or package.json"); return; }
    setResult(analyze(manifest, pkg));
    toast.success("Port plan generated");
  };

  const plistXml = result
    ? `<!-- Paste into ios/App/App/Info.plist -->\n` +
      result.plist.map(p => `<key>${p.key}</key>\n<string>${p.desc}</string>`).join("\n")
    : "";

  const copy = (label: string, t: string) => { navigator.clipboard.writeText(t); toast.success(`${label} copied`); };

  return (
    <DevHubPage title="Capacitor → iOS Porter" subtitle="Android permissions + Capacitor plugins → Info.plist + Xcode capabilities">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AndroidManifest.xml</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={10} value={manifest} onChange={e => setManifest(e.target.value)} placeholder="<uses-permission android:name=&quot;android.permission.CAMERA&quot; />…" className="font-mono text-xs" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">package.json</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={10} value={pkg} onChange={e => setPkg(e.target.value)} placeholder='{ "dependencies": { "@capacitor/camera": "^6.0.0", … } }' className="font-mono text-xs" />
          </CardContent>
        </Card>
      </div>

      <Button onClick={run} className="mt-4"><ArrowRightLeft className="w-4 h-4 mr-2" />Generate iOS port plan</Button>

      {result && (
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Info.plist usage descriptions ({result.plist.length})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("Info.plist", plistXml)}><Copy className="w-3 h-3" /></Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={plistXml} className="font-mono text-xs h-48" /></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Xcode capabilities to enable</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {result.capabilities.length === 0 && <p className="text-xs text-muted-foreground">None detected</p>}
              {result.capabilities.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Swift bridge / plugin notes</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copy("Swift stubs", result.swiftStubs)}><Copy className="w-3 h-3" /></Button>
            </CardHeader>
            <CardContent><Textarea readOnly value={result.swiftStubs} className="font-mono text-xs h-56" /></CardContent>
          </Card>

          {result.notes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Manual review needed</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
                  {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DevHubPage>
  );
}
