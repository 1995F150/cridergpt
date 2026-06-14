import { useState } from "react";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Github, Download, Copy, ExternalLink, Smartphone, Apple } from "lucide-react";

const ANDROID_REPO = "https://github.com/1995F150/CriderGPT-android-native";
const IOS_REPO = "https://github.com/1995F150/CriderGPT-IOS";

const syncBash = (repoUrl: string, label: string) => `#!/usr/bin/env bash
# sync-${label}.sh — overwrite repo with latest starter ZIP, commit, push.
# Usage: ./sync-${label}.sh /path/to/downloaded-starter.zip
set -euo pipefail

ZIP="\${1:?Pass the downloaded starter ZIP as the first arg}"
REPO_URL="${repoUrl}"
WORK="\$(mktemp -d)"
STAMP="\$(date -u +%Y%m%d-%H%M%SZ)"

echo "→ Cloning \$REPO_URL"
git clone --depth 1 "\$REPO_URL" "\$WORK/repo"

echo "→ Wiping working tree (keep .git)"
find "\$WORK/repo" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

echo "→ Unzipping \$ZIP"
unzip -q "\$ZIP" -d "\$WORK/unzipped"
INNER="\$(find "\$WORK/unzipped" -mindepth 1 -maxdepth 1 -type d | head -n1)"
cp -R "\$INNER"/. "\$WORK/repo"/

cd "\$WORK/repo"
git add -A
git commit -m "chore: sync from web v\$STAMP" || { echo "Nothing to commit"; exit 0; }
git push origin HEAD
echo "✓ Pushed to \$REPO_URL"
`;

const syncPwsh = (repoUrl: string, label: string) => `# sync-${label}.ps1 — overwrite repo with latest starter ZIP, commit, push.
# Usage:  .\\sync-${label}.ps1 -Zip C:\\path\\to\\starter.zip
param([Parameter(Mandatory=$true)][string]$Zip)
$ErrorActionPreference = "Stop"
$RepoUrl = "${repoUrl}"
$Work = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("cridersync-" + [guid]::NewGuid()))
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmssZ")

Write-Host "→ Cloning $RepoUrl"
git clone --depth 1 $RepoUrl (Join-Path $Work "repo")

Write-Host "→ Wiping working tree (keep .git)"
Get-ChildItem (Join-Path $Work "repo") -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

Write-Host "→ Expanding $Zip"
Expand-Archive -Path $Zip -DestinationPath (Join-Path $Work "unzipped") -Force
$Inner = Get-ChildItem (Join-Path $Work "unzipped") -Directory | Select-Object -First 1
Copy-Item (Join-Path $Inner.FullName "*") (Join-Path $Work "repo") -Recurse -Force

Push-Location (Join-Path $Work "repo")
git add -A
$changes = git status --porcelain
if (-not $changes) { Write-Host "Nothing to commit"; Pop-Location; exit 0 }
git commit -m "chore: sync from web v$Stamp"
git push origin HEAD
Pop-Location
Write-Host "✓ Pushed to $RepoUrl"
`;

const androidWorkflow = `name: Build Signed APK + AAB
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - name: Decode keystore
        run: echo "\${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > app/release.keystore
      - name: Build
        env:
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        run: |
          chmod +x ./gradlew
          ./gradlew assembleRelease bundleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: cridergpt-android
          path: |
            app/build/outputs/apk/release/*.apk
            app/build/outputs/bundle/release/*.aab
`;

const iosWorkflow = `name: Archive iOS
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:
jobs:
  archive:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Generate Xcode project
        run: |
          brew install xcodegen
          xcodegen generate || true
      - name: Build archive (unsigned)
        run: |
          xcodebuild -scheme CriderGPT \\
            -configuration Release \\
            -destination 'generic/platform=iOS' \\
            -archivePath build/CriderGPT.xcarchive \\
            archive CODE_SIGNING_ALLOWED=NO
      - uses: actions/upload-artifact@v4
        with:
          name: cridergpt-ios-xcarchive
          path: build/CriderGPT.xcarchive
`;

function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${filename}`);
  };
  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-md border border-border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <code className="text-xs font-mono text-muted-foreground">{filename}</code>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={copy}><Copy className="w-3 h-3 mr-1" />Copy</Button>
          <Button size="sm" variant="ghost" onClick={download}><Download className="w-3 h-3 mr-1" />Save</Button>
        </div>
      </div>
      <pre className="p-3 text-xs overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

function RepoCard({
  title, icon: Icon, repoUrl, starterRoute, label,
}: { title: string; icon: any; repoUrl: string; starterRoute: string; label: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant="outline">{label}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2 break-all">
          <Github className="w-3 h-3 shrink-0" />
          <a href={repoUrl} target="_blank" rel="noreferrer" className="hover:underline">{repoUrl}</a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={starterRoute}><Download className="w-4 h-4 mr-2" />Download latest ZIP</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={repoUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open repo</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${repoUrl}/actions`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Actions</a>
          </Button>
        </div>

        <Tabs defaultValue="bash">
          <TabsList>
            <TabsTrigger value="bash">sync-{label}.sh (Mac/Linux)</TabsTrigger>
            <TabsTrigger value="pwsh">sync-{label}.ps1 (Windows)</TabsTrigger>
            <TabsTrigger value="ci">GitHub Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="bash" className="mt-3">
            <CodeBlock code={syncBash(repoUrl, label)} filename={`sync-${label}.sh`} />
          </TabsContent>
          <TabsContent value="pwsh" className="mt-3">
            <CodeBlock code={syncPwsh(repoUrl, label)} filename={`sync-${label}.ps1`} />
          </TabsContent>
          <TabsContent value="ci" className="mt-3">
            <CodeBlock
              code={label === "android" ? androidWorkflow : iosWorkflow}
              filename={`.github/workflows/build.yml`}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function RepoSync() {
  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <h1 className="text-3xl font-bold tracking-tight">Repo Sync</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Push the latest Android + iOS starters from the website into your GitHub repos with one command.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">How to use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Click <strong>Download latest ZIP</strong> on either card.</p>
              <p>2. Save the matching <code>sync-android.sh</code> / <code>sync-ios.sh</code> (or the <code>.ps1</code> on Windows) somewhere permanent.</p>
              <p>3. Run it once per update: <code className="text-foreground">./sync-android.sh ~/Downloads/cridergpt-android-starter.zip</code></p>
              <p>4. GitHub Actions auto-builds a signed APK + AAB (Android) or an <code>.xcarchive</code> (iOS) on every push.</p>
              <p className="pt-2 text-xs">Android secrets needed in repo settings: <code>KEYSTORE_BASE64</code>, <code>KEYSTORE_PASSWORD</code>, <code>KEY_ALIAS</code>, <code>KEY_PASSWORD</code>. iOS signing happens on your Mac after the archive downloads.</p>
            </CardContent>
          </Card>

          <RepoCard
            title="CriderGPT Android (native Kotlin)"
            icon={Smartphone}
            repoUrl={ANDROID_REPO}
            starterRoute="/devhub/android-starter"
            label="android"
          />
          <RepoCard
            title="CriderGPT iOS (Swift + SwiftUI)"
            icon={Apple}
            repoUrl={IOS_REPO}
            starterRoute="/devhub/ios-starter"
            label="ios"
          />
        </div>
      </div>
    </DevHubGuard>
  );
}
