import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileCode2, ArrowLeft, Smartphone } from "lucide-react";
import { ANDROID_STARTER_FILES, ANDROID_STARTER_META } from "./androidStarterFiles";
import { toast } from "sonner";

export default function AndroidStarterExport() {
  const fileList = useMemo(() => Object.keys(ANDROID_STARTER_FILES).sort(), []);
  const [selected, setSelected] = useState<string>(fileList[0]);

  const downloadZip = async () => {
    try {
      const zip = new JSZip();
      const root = zip.folder("cridergpt-android-starter")!;
      for (const [path, content] of Object.entries(ANDROID_STARTER_FILES)) {
        root.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cridergpt-android-starter.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded — unzip and File → Open in Android Studio");
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
              <Smartphone className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">CriderGPT Android Starter</h1>
                <p className="text-xs text-muted-foreground">
                  Pre-written Kotlin + Compose project, pre-wired to Supabase. No payment code.
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
                Full website-parity scaffold. Open in Android Studio → File → Open → unzipped folder → Run ▶.
                The <strong>website is the source of truth</strong> — every screen hits the same Supabase tables/functions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Package</div>
                <code className="text-foreground">{ANDROID_STARTER_META.packageId}</code>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Supabase project</div>
                <code className="text-foreground">{ANDROID_STARTER_META.supabaseProjectRef}</code>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground">Tables / edge functions wired</div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary">{ANDROID_STARTER_META.edgeFunctionWired}</Badge>
                  {ANDROID_STARTER_META.tablesWired.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground">Session</div>
                <span>
                  Tokens stored in <code>EncryptedSharedPreferences</code> with auto-refresh.
                  <strong> Never signs out on app close</strong> — only the Sign Out menu clears the session.
                </span>
              </div>
              <div className="flex gap-2 flex-wrap sm:col-span-2">
                <Badge variant="secondary">Kotlin 1.9</Badge>
                <Badge variant="secondary">Compose BOM 2024.06</Badge>
                <Badge variant="secondary">Material 3 + Navigation</Badge>
                <Badge variant="secondary">Bottom nav: Chat · Livestock · Ideas · Calendar · Profile</Badge>
                <Badge variant="secondary">Drawer with external website links</Badge>
                <Badge variant="secondary">DevHub + Admin (role-gated via has_role RPC)</Badge>
                <Badge variant="secondary">Google OAuth (Chrome Custom Tab, no SHA-1)</Badge>
                <Badge variant="secondary">NFC tag reader (CriderGPT-XXXXXX)</Badge>
                <Badge variant="outline">No payment / paywall (by request)</Badge>
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
                    {ANDROID_STARTER_FILES[selected]}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next steps (after Run ▶)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Sign in with any existing CriderGPT account — works against the live Supabase auth.</p>
              <p>2. Send a message — it hits the <code>chat-with-ai</code> edge function and renders the reply.</p>
              <p>3. When you're ready: add Google Sign-In, FCM, NFC scanning, and Play Billing on top.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
