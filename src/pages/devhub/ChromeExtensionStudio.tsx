import { useState } from "react";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ExternalLink, Copy, Download, Chrome, DollarSign,
  Globe, Shield, Sparkles, Package, Wrench, Rocket, FolderTree, User,
} from "lucide-react";

const FOLDER_TREE = `my-extension/           ← this whole folder gets zipped
├── manifest.json       ← REQUIRED. Must be at the root, not inside a subfolder.
├── popup.html          ← UI shown when toolbar icon is clicked
├── popup.js
├── popup.css           (optional)
├── background.js       (optional — service worker)
├── content.js          (optional — runs on web pages)
├── icon16.png          ← 16x16
├── icon48.png          ← 48x48
└── icon128.png         ← 128x128 (REQUIRED for the store)

# Then: right-click "my-extension" folder → Compress → my-extension.zip
# Upload my-extension.zip (NOT a zip containing the folder-of-the-folder).`;

type Template = {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  monetization: string;
  files: { path: string; content: string }[];
};

const TEMPLATES: Template[] = [
  {
    id: "popup-starter",
    name: "Popup Starter (Hello World)",
    description: "Bare-bones MV3 extension with a popup. Perfect base to fork.",
    difficulty: "Beginner",
    monetization: "Free / Lead magnet",
    files: [
      {
        path: "manifest.json",
        content: `{
  "manifest_version": 3,
  "name": "{{NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon128.png"
  },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}`,
      },
      {
        path: "popup.html",
        content: `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body { width: 280px; font-family: system-ui; padding: 16px; }
  h1 { font-size: 16px; margin: 0 0 8px; }
  button { width: 100%; padding: 8px; border-radius: 6px; border: 0; background: #111; color: #fff; cursor: pointer; }
</style></head>
<body>
  <h1>{{NAME}}</h1>
  <p>{{DESCRIPTION}}</p>
  <button id="go">Do the thing</button>
  <script src="popup.js"></script>
</body></html>`,
      },
      {
        path: "popup.js",
        content: `document.getElementById('go').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => alert('Hello from {{NAME}}!')
  });
});`,
      },
    ],
  },
  {
    id: "content-blocker",
    name: "Content Script Injector",
    description: "Injects CSS/JS into every page. Foundation for ad blockers, UI tweakers, theme injectors.",
    difficulty: "Intermediate",
    monetization: "$2.99 one-time / freemium",
    files: [
      {
        path: "manifest.json",
        content: `{
  "manifest_version": 3,
  "name": "{{NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup.html" },
  "icons": { "128": "icon128.png" }
}`,
      },
      {
        path: "content.js",
        content: `// Runs on every page. Customize the selector + behavior.
console.log('{{NAME}} loaded on', location.hostname);
// Example: hide elements matching a selector saved by the user
chrome.storage.sync.get(['hideSelector'], ({ hideSelector }) => {
  if (!hideSelector) return;
  document.querySelectorAll(hideSelector).forEach(el => el.style.display = 'none');
});`,
      },
      { path: "content.css", content: `/* {{NAME}} - global page styles */` },
      {
        path: "popup.html",
        content: `<!doctype html><html><body style="width:260px;font-family:system-ui;padding:12px">
<h3>{{NAME}}</h3>
<label>Hide CSS selector</label>
<input id="sel" style="width:100%;padding:6px;margin:6px 0">
<button id="save" style="width:100%;padding:8px">Save</button>
<script src="popup.js"></script></body></html>`,
      },
      {
        path: "popup.js",
        content: `const sel = document.getElementById('sel');
chrome.storage.sync.get(['hideSelector'], ({ hideSelector }) => sel.value = hideSelector || '');
document.getElementById('save').onclick = () => chrome.storage.sync.set({ hideSelector: sel.value });`,
      },
    ],
  },
  {
    id: "side-panel-ai",
    name: "AI Side Panel",
    description: "Side panel that calls an AI endpoint with the current page's selected text. Great for summarizers, rewriters, translators.",
    difficulty: "Advanced",
    monetization: "$4.99/mo subscription via Stripe Checkout",
    files: [
      {
        path: "manifest.json",
        content: `{
  "manifest_version": 3,
  "name": "{{NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "permissions": ["sidePanel", "activeTab", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": { "default_title": "Open {{NAME}}" },
  "background": { "service_worker": "background.js" },
  "icons": { "128": "icon128.png" }
}`,
      },
      {
        path: "background.js",
        content: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);`,
      },
      {
        path: "sidepanel.html",
        content: `<!doctype html><html><body style="font-family:system-ui;padding:12px">
<h3>{{NAME}}</h3>
<button id="grab" style="width:100%;padding:8px;margin-bottom:8px">Summarize selection</button>
<div id="out" style="white-space:pre-wrap;font-size:14px"></div>
<script src="sidepanel.js"></script></body></html>`,
      },
      {
        path: "sidepanel.js",
        content: `document.getElementById('grab').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  });
  const out = document.getElementById('out');
  out.textContent = 'Calling AI...';
  // Replace with your edge function / OpenAI endpoint
  const r = await fetch('https://YOUR-ENDPOINT/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: result })
  });
  out.textContent = (await r.json()).summary || 'No response';
};`,
      },
    ],
  },
];

const RESOURCES = [
  {
    title: "Chrome Web Store — Publish",
    url: "https://chrome.google.com/webstore/devconsole",
    note: "One-time $5 developer fee. Upload your ZIP here.",
    icon: Rocket,
  },
  {
    title: "Chrome Extensions Docs (MV3)",
    url: "https://developer.chrome.com/docs/extensions",
    note: "Official Google docs. Always check here first.",
    icon: Globe,
  },
  {
    title: "Manifest V3 Reference",
    url: "https://developer.chrome.com/docs/extensions/reference/manifest",
    note: "Every field allowed in manifest.json.",
    icon: Wrench,
  },
  {
    title: "Chrome APIs Reference",
    url: "https://developer.chrome.com/docs/extensions/reference/api",
    note: "chrome.tabs, storage, scripting, sidePanel, runtime, etc.",
    icon: Package,
  },
  {
    title: "Edge Add-ons Store",
    url: "https://partner.microsoft.com/dashboard/microsoftedge/",
    note: "Free to publish. Same ZIP works as Chrome.",
    icon: Globe,
  },
  {
    title: "Firefox Add-ons (AMO)",
    url: "https://addons.mozilla.org/developers/",
    note: "Free. Needs small manifest tweaks (browser_specific_settings).",
    icon: Globe,
  },
  {
    title: "ExtensionPay — Paid extensions",
    url: "https://extensionpay.com/",
    note: "Drop-in paywall library. Handles Stripe + license keys for you. 5% fee.",
    icon: DollarSign,
  },
  {
    title: "Stripe Checkout (DIY paywall)",
    url: "https://stripe.com/docs/payments/checkout",
    note: "Roll your own license server. Cheaper at scale, more setup.",
    icon: DollarSign,
  },
  {
    title: "Chrome Web Store Listing Requirements",
    url: "https://developer.chrome.com/docs/webstore/cws-dashboard-listing",
    note: "Screenshots (1280x800), promo tile, description rules.",
    icon: Shield,
  },
  {
    title: "Review Process & Common Rejections",
    url: "https://developer.chrome.com/docs/webstore/review-process",
    note: "Read before submitting to avoid the 'minimum functionality' rejection.",
    icon: Shield,
  },
];

const IDEAS = [
  { name: "FFA Show Day Timer", pitch: "Floating timer + class checklist for show ring days. $2.99.", tag: "Niche" },
  { name: "Livestock Auction Bid Tracker", pitch: "Auto-logs bids on DVAuction / LMA pages into a CSV.", tag: "Niche" },
  { name: "Recipe Saver to CriderGPT", pitch: "One-click save any web recipe into your CriderGPT recipe vault. Free, drives signups.", tag: "Lead magnet" },
  { name: "Tab Group Auto-Saver", pitch: "Save + restore tab sessions by project. Freemium ($3.99 pro).", tag: "Utility" },
  { name: "YouTube Distraction Killer", pitch: "Hide shorts, recommended, comments. $1.99 one-time.", tag: "Utility" },
  { name: "AI Page Summarizer", pitch: "Side panel summary of any article. $4.99/mo.", tag: "AI" },
  { name: "Price History Lookup", pitch: "Show Amazon/Walmart price history on product pages.", tag: "Shopping" },
  { name: "Dark Mode Anywhere", pitch: "Force dark mode on any site. Free with optional $1.99 tip jar.", tag: "Utility" },
];

function downloadZipFallback(template: Template, name: string, description: string) {
  // No JSZip dependency: download each file individually as a fallback.
  template.files.forEach((f) => {
    const content = f.content.split("{{NAME}}").join(name).split("{{DESCRIPTION}}").join(description);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${template.id}-${f.path.replace(/\//g, "-")}`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

export default function ChromeExtensionStudio() {
  const { toast } = useToast();
  const [name, setName] = useState("My Cool Extension");
  const [description, setDescription] = useState("Does one useful thing really well.");
  const [selected, setSelected] = useState<Template>(TEMPLATES[0]);

  const renderedFile = (content: string) =>
    content.split("{{NAME}}").join(name).split("{{DESCRIPTION}}").join(description);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to="/devhub" className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Chrome className="w-6 h-6 text-primary" />
                  Chrome Extension Studio
                </h1>
                <p className="text-sm text-muted-foreground">
                  Templates, monetization, and every link you need to ship + sell extensions.
                </p>
              </div>
            </div>
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
              No-code friendly
            </Badge>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid grid-cols-4 max-w-2xl">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
              <TabsTrigger value="ship">Ship It</TabsTrigger>
            </TabsList>

            {/* TEMPLATES */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customize your extension</CardTitle>
                  <CardDescription>
                    Pick a template, set the name + description, and download the files. No coding needed — placeholders auto-fill.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Extension name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Short description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <Card
                    key={t.id}
                    className={`cursor-pointer transition-all ${selected.id === t.id ? "border-primary shadow-md" : "hover:border-primary/40"}`}
                    onClick={() => setSelected(t)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{t.difficulty}</Badge>
                      </div>
                      <CardDescription className="text-xs">{t.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" /> {t.monetization}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selected.name} — files</CardTitle>
                    <CardDescription>Copy or download. Drop into a folder, then load unpacked in Chrome.</CardDescription>
                  </div>
                  <Button onClick={() => downloadZipFallback(selected, name, description)}>
                    <Download className="w-4 h-4 mr-2" /> Download all files
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.files.map((f) => (
                    <div key={f.path} className="border rounded-md">
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                        <code className="text-xs font-mono">{f.path}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy(renderedFile(f.content), f.path)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <pre className="text-xs p-3 overflow-x-auto max-h-64">
                        <code>{renderedFile(f.content)}</code>
                      </pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RESOURCES */}
            <TabsContent value="resources" className="space-y-3 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {RESOURCES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <a key={r.url} href={r.url} target="_blank" rel="noreferrer">
                      <Card className="h-full hover:border-primary/60 transition-colors">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-base mt-2">{r.title}</CardTitle>
                          <CardDescription className="text-xs">{r.note}</CardDescription>
                        </CardHeader>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </TabsContent>

            {/* IDEAS */}
            <TabsContent value="ideas" className="space-y-3 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Extension ideas you could ship</CardTitle>
                  <CardDescription>Niche + utility ideas with monetization hints. Tap to copy as a starter prompt.</CardDescription>
                </CardHeader>
              </Card>
              <div className="grid sm:grid-cols-2 gap-3">
                {IDEAS.map((i) => (
                  <Card key={i.name} className="hover:border-primary/40 cursor-pointer"
                    onClick={() => copy(`Build a Chrome MV3 extension called "${i.name}". ${i.pitch}`, i.name)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{i.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">{i.tag}</Badge>
                      </div>
                      <CardDescription className="text-xs">{i.pitch}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* SHIP IT */}
            <TabsContent value="ship" className="space-y-3 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Step-by-step: from folder to paid listing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Step n={1} title="Test locally (free)">
                    Open <code>chrome://extensions</code> → toggle <b>Developer mode</b> → <b>Load unpacked</b> → pick your folder.
                  </Step>
                  <Step n={2} title="Zip the folder">
                    Right-click the folder → Compress to ZIP. The ZIP itself is what you upload (not the folder).
                  </Step>
                  <Step n={3} title="Pay the one-time $5 dev fee">
                    Go to <a className="text-primary underline" target="_blank" rel="noreferrer" href="https://chrome.google.com/webstore/devconsole">Chrome Web Store Developer Console</a>. Pay once, publish forever.
                  </Step>
                  <Step n={4} title="Add a paywall (optional)">
                    Easiest: drop in <a className="text-primary underline" target="_blank" rel="noreferrer" href="https://extensionpay.com/">ExtensionPay</a> (5% fee, Stripe-backed). Or roll your own with Stripe Checkout + a license check.
                  </Step>
                  <Step n={5} title="Upload + fill the listing">
                    Need: 128x128 icon, 440x280 promo tile, at least one 1280x800 screenshot, description, category, privacy policy URL.
                  </Step>
                  <Step n={6} title="Wait for review">
                    Usually 1-3 days. Common rejection: "single purpose" — make sure your description matches what the extension actually does.
                  </Step>
                  <Step n={7} title="Cross-publish for free">
                    Same ZIP works on <a className="text-primary underline" target="_blank" rel="noreferrer" href="https://partner.microsoft.com/dashboard/microsoftedge/">Edge Add-ons</a> (free) and (with tiny tweaks) <a className="text-primary underline" target="_blank" rel="noreferrer" href="https://addons.mozilla.org/developers/">Firefox AMO</a>.
                  </Step>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing cheat sheet</CardTitle>
                  <CardDescription>What people actually pay for browser extensions in 2026.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><b>Free + tip jar:</b> Best for utilities. Drives installs, builds trust.</p>
                  <p><b>$1.99 - $4.99 one-time:</b> Sweet spot for niche utilities (timers, blockers, savers).</p>
                  <p><b>$2.99 - $9.99 / month:</b> Anything AI-powered with ongoing API cost.</p>
                  <p><b>Freemium:</b> Free core, paid pro tier (sync, unlimited saves, AI). Highest revenue ceiling.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DevHubGuard>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}
