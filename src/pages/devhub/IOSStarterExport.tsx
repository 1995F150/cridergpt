import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileCode2, ArrowLeft, Apple } from "lucide-react";
import { IOS_STARTER_FILES, IOS_STARTER_META } from "./iosStarterFiles";
import { toast } from "sonner";

export default function IOSStarterExport() {
  const fileList = useMemo(() => Object.keys(IOS_STARTER_FILES).sort(), []);
  const [selected, setSelected] = useState<string>(fileList[0]);

  const downloadZip = async () => {
    try {
      const zip = new JSZip();
      for (const [path, content] of Object.entries(IOS_STARTER_FILES)) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cridergpt-ios-starter.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded — open the unzipped folder, run bash reset-xcode-project.sh inside it, then pick a simulator and Run");
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed");
    }
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to="/devhub" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Apple className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">CriderGPT iOS Starter</h1>
                <p className="text-xs text-muted-foreground">
                  Pre-written Swift + SwiftUI project, pre-wired to Supabase + StoreKit 2.
                </p>
              </div>
            </div>
            <Button onClick={downloadZip} size="lg">
              <Download className="mr-2 h-4 w-4" /> Download ZIP
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's inside</CardTitle>
              <CardDescription>
                Full website-parity scaffold mirroring the Android starter. The <strong>website is the source of truth</strong> — every screen hits the same Supabase tables/functions.
                Open the unzipped folder in Terminal, then run <code>bash reset-xcode-project.sh</code> from the folder that contains the script. It deletes stale Xcode output, regenerates <code>CriderGPT.xcodeproj</code>, and opens it.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Bundle ID</div>
                <code className="text-foreground">{IOS_STARTER_META.bundleId}</code>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Supabase project</div>
                <code className="text-foreground">{IOS_STARTER_META.supabaseProjectRef}</code>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground">Tables / edge functions wired</div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary">{IOS_STARTER_META.edgeFunctionWired}</Badge>
                  <Badge variant="secondary">verify-iap</Badge>
                  {IOS_STARTER_META.tablesWired.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground">Session</div>
                <span>
                  Tokens stored in <code>Keychain</code> (kSecAttrAccessibleAfterFirstUnlock) with auto-refresh.
                  <strong> Never signs out on app close</strong> — only the Sign Out button clears the session.
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground">Only placeholder</div>
                <span>
                  IAP product IDs in <code>Config.swift</code>. Defaults match the Android Play Console
                  (<code>cridergpt_plus_monthly</code>, <code>cridergpt_pro_monthly</code>) — overwrite with the exact IDs from
                  App Store Connect → Monetization → Subscriptions when ready.
                </span>
              </div>
              <div className="flex gap-2 flex-wrap sm:col-span-2">
                <Badge variant="secondary">Swift 5.0 / iOS 16.0</Badge>
                <Badge variant="secondary">SwiftUI + Combine</Badge>
                <Badge variant="secondary">Bottom tabs: Chat · Livestock · Ideas · Calendar · Profile</Badge>
                <Badge variant="secondary">Side menu with external website links → Safari</Badge>
                <Badge variant="secondary">DevHub + Admin (role-gated via has_role RPC)</Badge>
                <Badge variant="secondary">CoreNFC reader (CriderGPT-XXXXXX)</Badge>
                <Badge variant="secondary">StoreKit 2 + verify-iap</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCode2 className="h-4 w-4" /> Browse source ({fileList.length} files)
              </CardTitle>
              <CardDescription>Preview anything before downloading.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-[260px_1fr] gap-4">
                <ScrollArea className="h-[420px] rounded-md border bg-muted/30 p-2">
                  <div className="space-y-1">
                    {fileList.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelected(f)}
                        className={`block w-full text-left text-xs px-2 py-1 rounded hover:bg-accent ${
                          selected === f ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <ScrollArea className="h-[420px] rounded-md border bg-muted/30">
                  <pre className="text-xs p-3 whitespace-pre-wrap break-words">
                    {IOS_STARTER_FILES[selected]}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Unzip and make sure the folder contains <code>reset-xcode-project.sh</code> (e.g., <code>cd ~/Downloads/cridergpt-ios-starter/cridergpt-ios-starter</code> if your unzip created a nested folder).</p>
              <p>2. Run <code>bash reset-xcode-project.sh</code> from that exact folder to produce a fresh <code>.xcodeproj</code>. The script installs XcodeGen automatically if it is missing.</p>
              <p>3. Open in Xcode → set your Apple Team in Signing &amp; Capabilities.</p>
              <p>4. Run on a device or simulator — sign in with any existing CriderGPT account.</p>
              <p>5. Paste your real IAP product IDs into <code>Config.swift</code> once App Store Connect is ready (Play Console defaults are already wired).</p>
              <p>6. Push to your iOS GitHub repo to keep the native client in sync with the website.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
