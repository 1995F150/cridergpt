import { useState } from "react";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CRIDERGPT_EXTENSIONS, type SuiteExt } from "./criderGPTExtensions";
import {
  ChevronLeft, ExternalLink, Copy, Download, Chrome, DollarSign,
  Globe, Shield, Sparkles, Package, Wrench, Rocket, FolderTree, User,
  Boxes, FileCode,
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
  { name: "Audio Booster Pro", pitch: "Boost any tab's volume up to 600% with per-tab memory + bass boost slider.", tag: "Utility", price: "$2.99 one-time" },
  { name: "FFA Show Day Timer", pitch: "Floating timer + class checklist for show ring days.", tag: "Niche", price: "$2.99 one-time" },
  { name: "Livestock Auction Bid Tracker", pitch: "Auto-logs bids on DVAuction / LMA pages into a CSV.", tag: "Niche", price: "$4.99 one-time" },
  { name: "Recipe Saver to CriderGPT", pitch: "One-click save any web recipe into your CriderGPT recipe vault.", tag: "Lead magnet", price: "Free" },
  { name: "Tab Group Auto-Saver", pitch: "Save + restore tab sessions by project. Freemium pro tier.", tag: "Utility", price: "$3.99 one-time" },
  { name: "YouTube Distraction Killer", pitch: "Hide shorts, recommended, comments, end cards.", tag: "Utility", price: "$1.99 one-time" },
  { name: "AI Page Summarizer", pitch: "Side panel summary of any article in 5 bullets.", tag: "AI", price: "$4.99/mo" },
  { name: "Price History Lookup", pitch: "Show Amazon/Walmart price history on product pages.", tag: "Shopping", price: "Free / $2.99 pro" },
  { name: "Dark Mode Anywhere", pitch: "Force dark mode on any site with per-site overrides.", tag: "Utility", price: "Free + tip jar" },
  { name: "Sleep Timer for Web Video", pitch: "Auto-pause YouTube/Netflix/Twitch after X minutes.", tag: "Utility", price: "$1.99 one-time" },
  { name: "Reading Mode Plus", pitch: "Strip ads + popups, pick font/spacing, save to read-later.", tag: "Utility", price: "$3.99 one-time" },
  { name: "Auto-Skip Ads & Sponsors", pitch: "Skip YouTube intros, sponsor segments, mid-rolls.", tag: "Utility", price: "$2.99 one-time" },
  { name: "Speed Reader Highlighter", pitch: "Bionic-style bold leading letters for faster reading.", tag: "Productivity", price: "Free + $1.99 pro" },
  { name: "Mute Tab on Switch", pitch: "Auto-mute any background tab the moment you leave it.", tag: "Utility", price: "$0.99 one-time" },
  { name: "Auto-Close Duplicate Tabs", pitch: "Merge duplicate tabs instantly. Saves RAM.", tag: "Utility", price: "Free" },
  { name: "Screenshot Full Page", pitch: "Capture entire scrollable page → PNG/PDF.", tag: "Utility", price: "$1.99 one-time" },
  { name: "GIF Maker from Video", pitch: "Select a video region, set start/end, export GIF.", tag: "Creator", price: "$3.99 one-time" },
  { name: "Color Picker + Eyedropper", pitch: "Pick any color on any page, save palettes.", tag: "Designer", price: "Free + $1.99 pro" },
  { name: "Font Identifier", pitch: "Hover any text, see the font family + weight + size.", tag: "Designer", price: "$2.99 one-time" },
  { name: "Page Word Counter", pitch: "Live word/character/reading-time counter for any page.", tag: "Writer", price: "Free" },
  { name: "Grammar Quick-Fix", pitch: "Highlight text, get AI-rewritten clean version.", tag: "AI Writer", price: "$4.99/mo" },
  { name: "Email Template Vault", pitch: "Save and one-click paste email replies into Gmail/Outlook.", tag: "Productivity", price: "$3.99 one-time" },
  { name: "Meeting Note Catcher", pitch: "Auto-transcribe browser meetings → notes + action items.", tag: "AI", price: "$6.99/mo" },
  { name: "Pomodoro Floating Timer", pitch: "25/5 timer pinned over any tab, with daily stats.", tag: "Productivity", price: "$1.99 one-time" },
  { name: "Site Blocker for Focus", pitch: "Block distracting sites during set hours.", tag: "Productivity", price: "Free + $2.99 pro" },
  { name: "Password Strength Audit", pitch: "Scan saved passwords for weak/reused ones (local only).", tag: "Security", price: "$3.99 one-time" },
  { name: "Tracker Blocker Lite", pitch: "Block trackers, show count per site, no account needed.", tag: "Privacy", price: "Free + tip jar" },
  { name: "Cookie Banner Killer", pitch: "Auto-decline cookie popups on every site.", tag: "Privacy", price: "$1.99 one-time" },
  { name: "VPN Status Indicator", pitch: "Pinned country/IP indicator + leak test button.", tag: "Privacy", price: "Free" },
  { name: "Web3 Wallet Checker", pitch: "Hover any wallet address → see balance + ENS.", tag: "Crypto", price: "$4.99 one-time" },
  { name: "Etsy Listing Helper", pitch: "Auto-fill tags, scan competitor pricing, optimize titles.", tag: "Seller", price: "$6.99/mo" },
  { name: "Amazon Review Honesty Score", pitch: "Fakespot-style fake-review detector for product pages.", tag: "Shopping", price: "Free + $2.99 pro" },
  { name: "Coupon Auto-Apply", pitch: "Tries every known coupon at checkout, keeps the best.", tag: "Shopping", price: "Free (affiliate)" },
  { name: "eBay Bid Sniper", pitch: "Auto-bid in the final 5 seconds of an auction.", tag: "Shopping", price: "$4.99 one-time" },
  { name: "Zillow Hidden Data", pitch: "Show price drops, days on market, school ratings inline.", tag: "Real Estate", price: "$3.99/mo" },
  { name: "LinkedIn Hide Promoted", pitch: "Strip 'Promoted' posts + suggested feed clutter.", tag: "Utility", price: "$1.99 one-time" },
  { name: "Twitter/X Cleanser", pitch: "Hide For You tab, ads, trending, blue checks (toggle).", tag: "Utility", price: "$1.99 one-time" },
  { name: "Reddit Old UI Forever", pitch: "Force old.reddit.com on every link.", tag: "Utility", price: "Free" },
  { name: "Instagram Web Downloader", pitch: "Save IG photos/reels from the browser legally for your own posts.", tag: "Creator", price: "$3.99 one-time" },
  { name: "TikTok Bulk Saver", pitch: "Save TikTok videos you posted with original quality.", tag: "Creator", price: "$3.99 one-time" },
  { name: "YouTube Thumbnail Downloader", pitch: "Grab any video's HD thumbnail with one click.", tag: "Creator", price: "Free" },
  { name: "YouTube to MP3 Note-Taker", pitch: "Save timestamped notes against a YouTube video.", tag: "Student", price: "$2.99 one-time" },
  { name: "Twitch Auto-Claim Points", pitch: "Auto-claim channel points + drops in background tabs.", tag: "Gaming", price: "$2.99 one-time" },
  { name: "Steam Wishlist Price Drop", pitch: "Pings you when a wishlisted game drops below target.", tag: "Gaming", price: "Free + $1.99 pro" },
  { name: "Discord Quick Notes", pitch: "Pin notes per channel, syncs across browsers.", tag: "Gaming", price: "$1.99 one-time" },
  { name: "Spotify Lyrics Anywhere", pitch: "Show synced lyrics over web player + sidebar.", tag: "Music", price: "$2.99 one-time" },
  { name: "Bandcamp Auto-Buy Tracker", pitch: "Watch artists, alert on new releases.", tag: "Music", price: "Free" },
  { name: "Pinterest Image Saver Plus", pitch: "Bulk-save board images at original resolution.", tag: "Designer", price: "$3.99 one-time" },
  { name: "Calendar Quick-Add", pitch: "Highlight any date/time on any page → add to Google Cal.", tag: "Productivity", price: "Free" },
  { name: "Currency Converter Inline", pitch: "Hover any price, see your local currency conversion.", tag: "Travel", price: "Free" },
  { name: "Translator Side Panel", pitch: "Real-time translate the page or selection with glossary memory.", tag: "AI", price: "$3.99/mo" },
  { name: "Flight Price Watcher", pitch: "Track Google Flights / Skyscanner trips, alert on drops.", tag: "Travel", price: "$4.99 one-time" },
  { name: "Hotel Hidden Fees Exposer", pitch: "Add resort/cleaning fees into displayed prices.", tag: "Travel", price: "$2.99 one-time" },
  { name: "Job Board Aggregator", pitch: "Pull LinkedIn + Indeed + Wellfound into one feed.", tag: "Career", price: "Free + $3.99 pro" },
  { name: "Resume Auto-Filler", pitch: "Fill job applications from a saved profile, one click.", tag: "Career", price: "$4.99 one-time" },
  { name: "Stack Overflow Auto-Copy", pitch: "Copy code blocks cleanly without the prompt prefix.", tag: "Developer", price: "Free" },
  { name: "JSON Pretty-Print", pitch: "Auto-format API responses + collapsible tree.", tag: "Developer", price: "Free" },
  { name: "Regex Tester Side Panel", pitch: "Build + test regex without leaving your tab.", tag: "Developer", price: "$1.99 one-time" },
  { name: "Lighthouse Quick-Audit", pitch: "Run perf/SEO audit on the current page, save reports.", tag: "Developer", price: "$3.99 one-time" },
  { name: "Bookmark Auto-Tagger", pitch: "AI tags + summaries for every bookmark you save.", tag: "AI", price: "$2.99/mo" },
  { name: "Highlight & Save (Notion)", pitch: "Highlight any text, push to Notion with source link.", tag: "Productivity", price: "$3.99 one-time" },
  { name: "ChatGPT Folder Sidebar", pitch: "Group ChatGPT chats into folders with search.", tag: "AI", price: "$4.99 one-time" },
  { name: "Gemini Auto-Continue", pitch: "Auto-clicks 'continue' on long Gemini outputs.", tag: "AI", price: "$1.99 one-time" },
  { name: "Local AI Chat (Ollama)", pitch: "Side panel that calls your local Ollama server, no cloud.", tag: "AI", price: "Free" },
  { name: "Page Diff Watcher", pitch: "Get notified when a specific page changes (price, stock).", tag: "Productivity", price: "$3.99 one-time" },
  { name: "RSS Inbox Sidebar", pitch: "Lightweight feed reader, no account needed.", tag: "Productivity", price: "Free + $1.99 pro" },
  { name: "Weather on New Tab", pitch: "Clean new-tab weather + 7-day forecast.", tag: "Utility", price: "Free" },
  { name: "Crypto Portfolio Tracker", pitch: "Sidebar portfolio with live prices, no wallet connect.", tag: "Crypto", price: "$3.99 one-time" },
  { name: "Stock Earnings Calendar", pitch: "Hover any ticker, see earnings date + history.", tag: "Finance", price: "$2.99 one-time" },
  { name: "Hashtag Generator", pitch: "AI suggests trending hashtags for any caption.", tag: "Creator", price: "$2.99/mo" },
  { name: "Background Noise Generator", pitch: "Rain / cafe / brown noise pinned to your browser.", tag: "Productivity", price: "$1.99 one-time" },
  { name: "Picture-in-Picture Plus", pitch: "Forces PiP on any HTML5 video, drag corners.", tag: "Utility", price: "$2.99 one-time" },
  { name: "Auto-Refresh on Schedule", pitch: "Refresh tabs every N seconds (with stop conditions).", tag: "Utility", price: "$1.99 one-time" },
  { name: "Print to Clean PDF", pitch: "Strip ads/nav before printing or saving as PDF.", tag: "Utility", price: "$2.99 one-time" },
  { name: "Right-Click Restored", pitch: "Re-enable right-click on sites that block it.", tag: "Utility", price: "$0.99 one-time" },
  { name: "Auto-Login Vault", pitch: "Local-only password autofill with biometric unlock.", tag: "Security", price: "$4.99 one-time" },
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
          <Tabs defaultValue="suite" className="w-full">
            <TabsList className="grid grid-cols-5 max-w-3xl">
              <TabsTrigger value="suite" className="text-xs sm:text-sm">CriderGPT Suite</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
              <TabsTrigger value="resources" className="text-xs sm:text-sm">Resources</TabsTrigger>
              <TabsTrigger value="ideas" className="text-xs sm:text-sm">Ideas</TabsTrigger>
              <TabsTrigger value="ship" className="text-xs sm:text-sm">Ship It</TabsTrigger>
            </TabsList>

            {/* CRIDERGPT SUITE — full source extensions wired to the live backend */}
            <TabsContent value="suite" className="space-y-4 mt-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" /> CriderGPT Suite — full source extensions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Every extension below ships as a complete, working folder pre-wired to your live CriderGPT Supabase backend
                    (auth + database + edge functions). Download the ZIP, load unpacked in Chrome to test, then drop in payments
                    later or publish straight to the Chrome Web Store. Add your own icons (16/48/128px) before publishing.
                  </CardDescription>
                </CardHeader>
              </Card>

              {CRIDERGPT_EXTENSIONS.map((ext) => (
                <SuiteExtCard key={ext.id} ext={ext} />
              ))}
            </TabsContent>

            {/* TEMPLATES */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Publisher profile
                  </CardTitle>
                  <CardDescription className="text-xs">
                    This is the name buyers will see on the Chrome Web Store listing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><b>Developer:</b> Jessie Crider</div>
                  <div><b>Publisher:</b> CriderGPT</div>
                  <div><b>Support email:</b> support@cridergpt.com</div>
                  <div className="text-xs text-muted-foreground pt-1">
                    Status: ID submitted — pending Google verification. Once verified, this name appears on every listing automatically.
                  </div>
                </CardContent>
              </Card>

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
                  <CardDescription>{IDEAS.length} ideas with suggested prices. Tap to copy as a starter prompt.</CardDescription>
                </CardHeader>
              </Card>
              <div className="grid sm:grid-cols-2 gap-3">
                {IDEAS.map((i) => (
                  <Card key={i.name} className="hover:border-primary/40 cursor-pointer"
                    onClick={() => copy(`Build a Chrome MV3 extension called "${i.name}". ${i.pitch} Suggested price: ${i.price}.`, i.name)}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{i.name}</CardTitle>
                        <Badge variant="outline" className="text-xs shrink-0">{i.tag}</Badge>
                      </div>
                      <CardDescription className="text-xs">{i.pitch}</CardDescription>
                      <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1">
                        <DollarSign className="w-3 h-3" /> {i.price}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* SHIP IT */}
            <TabsContent value="ship" className="space-y-3 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FolderTree className="w-4 h-4" /> What the folder should look like</CardTitle>
                  <CardDescription>
                    Make a regular folder on your desktop, drop these files in, then zip THAT folder. No special structure — flat is fine.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/40 border rounded-md p-3 overflow-x-auto whitespace-pre font-mono">{FOLDER_TREE}</pre>
                  <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    <p><b>Most common mistake:</b> zipping a folder that <i>contains</i> your extension folder. The ZIP must open straight to <code>manifest.json</code>, not to another folder.</p>
                    <p><b>Check it:</b> double-click your ZIP — if you see <code>manifest.json</code> right away, you're good. If you see a folder first, re-zip from inside.</p>
                  </div>
                </CardContent>
              </Card>


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

function SuiteExtCard({ ext }: { ext: SuiteExt }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const downloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder(ext.id)!;
    ext.files.forEach((f) => folder.file(f.path, f.content));
    // Bake the CriderGPT logo into real icon16/48/128 PNGs so the
    // Chrome Web Store upload doesn't reject the package.
    try {
      const icons = await generateIconBlobs("/cridergpt-logo-app-icon.png", [16, 48, 128]);
      for (const { size, blob } of icons) {
        folder.file(`icon${size}.png`, blob);
      }
    } catch (e) {
      console.error("Icon generation failed, falling back to README", e);
      folder.file("ICONS_README.txt",
        "Auto-icon generation failed. Add icon16.png, icon48.png, and icon128.png manually.");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ext.id}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: `${ext.name} downloaded`, description: "Includes icon16/48/128.png. Unzip → chrome://extensions → Load unpacked, or upload the ZIP to the Web Store." });
  };

  const copyFile = async (content: string, path: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: `${path} copied` });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" /> {ext.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">{ext.tagline}</CardDescription>
          </div>
          <Button onClick={downloadZip} size="sm">
            <Download className="w-4 h-4 mr-2" /> Download ZIP
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ext.features.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{ext.pitch}</p>
        <div className="text-xs text-muted-foreground">
          <b>{ext.files.length} files</b> · pre-wired to <code className="text-[10px]">udpldrrpebdyuiqdtqnq.supabase.co</code>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          {open ? "Hide source" : "View source"}
        </Button>
        {open && (
          <div className="space-y-2">
            {ext.files.map((f) => (
              <div key={f.path} className="border rounded-md">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <code className="text-xs font-mono">{f.path}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyFile(f.content, f.path)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="text-xs p-3 overflow-x-auto max-h-72"><code>{f.content}</code></pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
