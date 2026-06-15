import { Link } from "react-router-dom";
import JSZip from "jszip";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ROKU_CHANNELS } from "./rokuChannels";
import {
  ChevronLeft, ExternalLink, Tv, DollarSign, BookOpen, Wrench, Rocket, Code2, Copy,
  Filter, Download, Package,
} from "lucide-react";

const RESOURCES = [
  { title: "Roku Developer Portal", url: "https://developer.roku.com/", note: "Free account. No annual fee. Publish all the channels you want.", icon: Rocket },
  { title: "BrightScript Reference", url: "https://developer.roku.com/docs/references/brightscript/language/brightscript-language-reference.md", note: "The language Roku channels are built in. Looks like BASIC, runs like JavaScript-lite.", icon: Code2 },
  { title: "SceneGraph Components", url: "https://developer.roku.com/docs/references/scenegraph/component-functional-fields/component-fields.md", note: "Roku's UI framework. Every screen is an XML component.", icon: BookOpen },
  { title: "Roku Channel Templates (GitHub)", url: "https://github.com/rokudev", note: "Official sample channels: video player, grid, ads, deep linking.", icon: Code2 },
  { title: "Publishing & Certification", url: "https://developer.roku.com/docs/developer-program/publishing/channel-publishing-overview.md", note: "Step-by-step: package, submit, certification, public vs private (beta) channels.", icon: Rocket },
  { title: "Roku Pay (Subscriptions)", url: "https://developer.roku.com/docs/developer-program/roku-pay/overview.md", note: "Built-in billing. Roku takes 20% Y1, 15% after. Handles all payments + refunds.", icon: DollarSign },
  { title: "Roku Ads Framework (RAF)", url: "https://developer.roku.com/docs/developer-program/advertising/roku-advertising-framework.md", note: "Free ads SDK. Pre-roll + mid-roll video ads with revenue share.", icon: DollarSign },
  { title: "Dev Settings & Sideload", url: "https://developer.roku.com/docs/developer-program/getting-started/developer-setup.md", note: "Enable Developer Mode on your Roku (Home x3, Up x2, Right, Left, Right, Left, Right). Sideload ZIPs over LAN.", icon: Wrench },
  { title: "Deep Linking Spec", url: "https://developer.roku.com/docs/developer-program/discovery/implementing-deep-linking.md", note: "Required for Roku Search + The Roku Channel discovery.", icon: BookOpen },
  { title: "Channel Store Listing Guidelines", url: "https://developer.roku.com/docs/developer-program/publishing/channel-publishing-overview.md", note: "Icon sizes, screenshots, content classifications.", icon: BookOpen },
];

const IDEAS = [
  { name: "FFA Show Watch", pitch: "Stream livestock auctions, fair coverage, and FFA event replays.", monetization: "Free + Roku Pay $2.99/mo for archives", category: "FFA" },
  { name: "Farm Sim Highlights", pitch: "Curated FS25/FS22 mod showcases and tutorials, pulled from YouTube.", monetization: "Ad-supported via RAF", category: "Gaming" },
  { name: "Tractor Pull TV", pitch: "Niche channel for tractor pull events. License clips from local fairs.", monetization: "$3.99 one-time channel unlock", category: "FFA" },
  { name: "Country Gospel Radio", pitch: "Audio-only channel streaming gospel + bluegrass radio stations.", monetization: "Free + tip jar", category: "Music" },
  { name: "Recipe Reader", pitch: "Big-screen recipe display synced with your CriderGPT recipe vault.", monetization: "Free (drives CriderGPT signups)", category: "Utility" },
  { name: "Workshop Cam Viewer", pitch: "Stream a local IP camera (welding shop, barn) to your TV.", monetization: "$1.99 one-time", category: "Utility" },
  { name: "Snow Day Cam", pitch: "Aggregates public weather + traffic cams by region.", monetization: "Ad-supported", category: "Weather" },
  { name: "RDR2 Lore Channel", pitch: "Loop your RDR2 gamer-guide content as a video channel.", monetization: "Free + tip jar", category: "Gaming" },
  { name: "Auction Calendar", pitch: "TV-friendly list of upcoming livestock + equipment auctions in your area.", monetization: "Free (affiliate links to listings)", category: "FFA" },
  { name: "Local High School Sports", pitch: "Embed YouTube live streams from local schools. Niche but loyal audience.", monetization: "Ad-supported", category: "Sports" },
  // ---- 50 MORE IDEAS ----
  { name: "CriderGPT Dashboard", pitch: "Big-screen overview of your farm data, livestock tags, and tasks.", monetization: "Free (companion to web app)", category: "Utility" },
  { name: "Barn Radio FM", pitch: "Curated country, southern rock, and farm-work playlists. Audio-only.", monetization: "Free + Roku Ads", category: "Music" },
  { name: "Cattle Market Prices", pitch: "Daily commodity prices, charts, and news for beef, pork, grain.", monetization: "$1.99/mo", category: "FFA" },
  { name: "Hay Calculator", pitch: "Input bale count and weight. TV displays total tons and cost per ton.", monetization: "$0.99 one-time", category: "Utility" },
  { name: "FS25 Mod Browser", pitch: "Browse, preview, and queue Farming Simulator mods for later download.", monetization: "Free (affiliate mod-host links)", category: "Gaming" },
  { name: "Trophy Wall", pitch: "Display your hunting, fishing, and show ribbons in a digital gallery.", monetization: "$2.99 one-time", category: "FFA" },
  { name: "Small Engine Repair", pitch: "Video tutorials for chainsaws, mowers, tillers. Filter by brand.", monetization: "Ad-supported", category: "Utility" },
  { name: "Weather Watcher", pitch: "Hyperlocal weather with radar, 7-day forecast, and frost alerts.", monetization: "Free + Roku Ads", category: "Weather" },
  { name: "Dirt Track Racing", pitch: "Local dirt track race schedules, results, and highlight reels.", monetization: "$2.99/mo", category: "Sports" },
  { name: "Homestead How-To", pitch: "Gardening, canning, solar, and off-grid living video guides.", monetization: "Ad-supported", category: "Utility" },
  { name: "Sermon Stream", pitch: "Live and archived church services. Filter by denomination and zip.", monetization: "Free (donation button)", category: "Music" },
  { name: "Hunting Season Countdown", pitch: "Days until opener for deer, turkey, duck by state.", monetization: "$0.99 one-time", category: "FFA" },
  { name: "Tractor Specs", pitch: "Compare horsepower, lift capacity, and price across John Deere, Kubota, etc.", monetization: "Free (dealer lead gen)", category: "Utility" },
  { name: "4x4 Trail Maps", pitch: "Off-road trail videos with difficulty ratings and GPS coordinates.", monetization: "$1.99 one-time", category: "Gaming" },
  { name: "Gunsmithing 101", pitch: "Cleaning, customization, and safety videos for firearms.", monetization: "Ad-supported", category: "Utility" },
  { name: "Kids Farm Friends", pitch: "Educational animal videos for toddlers. No ads. Parental timer.", monetization: "$1.99/mo", category: "Kids" },
  { name: "Cow-Calf Calendar", pitch: "Breeding, calving, and weaning schedule tracker for herds.", monetization: "$2.99 one-time", category: "FFA" },
  { name: "Mud Bog Madness", pitch: "Truck and tractor mud bog event replays and schedules.", monetization: "Ad-supported", category: "Sports" },
  { name: "Southern Cooking", pitch: "Step-by-step recipes for biscuits, gravy, BBQ, and cornbread.", monetization: "Free + affiliate cookware", category: "Utility" },
  { name: "Livestock Health", pitch: "Symptom checker and treatment videos for cattle, sheep, goats.", monetization: "$4.99/mo", category: "FFA" },
  { name: "Farm Safety", pitch: "OSHA-aligned safety training videos for machinery and chemicals.", monetization: "Free (grant-funded)", category: "Utility" },
  { name: "Antique Tractor", pitch: "Restoration timelines, parts sourcing, and show schedules.", monetization: "Ad-supported", category: "FFA" },
  { name: "Rodeo Replay", pitch: "PRCA and local rodeo event archives, scores, and rider bios.", monetization: "$3.99/mo", category: "Sports" },
  { name: "Beekeeper's Log", pitch: "Hive inspection reminders, honey yield tracking, and swarm alerts.", monetization: "$1.99 one-time", category: "FFA" },
  { name: "Firepit Stories", pitch: "Audio ghost stories and southern folklore. Perfect background noise.", monetization: "Free + tip jar", category: "Music" },
  { name: "Pond Management", pitch: "Stocking rates, water quality tips, and fishing forecasts for farm ponds.", monetization: "$1.99 one-time", category: "FFA" },
  { name: "Skid Steer Simulator", pitch: "Video walkthroughs of skid steer operations and attachments.", monetization: "Ad-supported", category: "Utility" },
  { name: "FFA Degree Tracker", pitch: "Greenhand to American FFA Degree progress dashboard.", monetization: "Free (drives app signups)", category: "FFA" },
  { name: "Combine Cam", pitch: "In-cab live streams during harvest season from popular operators.", monetization: "Ad-supported", category: "FFA" },
  { name: "Backroad Atlas", pitch: "Scenic drive videos with local history voiceovers. One state per playlist.", monetization: "Free + tourism ads", category: "Utility" },
  { name: "Coon Hunting", pitch: "Night hunt footage with hounds, treeing highlights, and competition scores.", monetization: "Ad-supported", category: "FFA" },
  { name: "Equine Health", pitch: "Hoof care, dental floats, and colic prevention videos for horse owners.", monetization: "$2.99/mo", category: "FFA" },
  { name: "Ag News Network", pitch: "Daily 5-min ag news briefs: markets, policy, weather, tech.", monetization: "Ad-supported", category: "Weather" },
  { name: "Bass Fishing HQ", pitch: "Lake reports, lure reviews, and tournament brackets.", monetization: "$1.99/mo", category: "Sports" },
  { name: "Greenhouse Guru", pitch: "Hydroponic, aquaponic, and greenhouse build tutorials.", monetization: "Ad-supported", category: "Utility" },
  { name: "Farm Auction TV", pitch: "Live and upcoming equipment auctions with lot previews.", monetization: "Free (affiliate to auction sites)", category: "FFA" },
  { name: "Mechanic's Bench", pitch: "Diagnostics, torque specs, and wiring diagrams for common farm vehicles.", monetization: "$3.99/mo", category: "Utility" },
  { name: "Dairy Dashboard", pitch: "Milk production, somatic cell counts, and feed rations on TV.", monetization: "$2.99/mo", category: "FFA" },
  { name: "Rural Real Estate", pitch: "Browse farms, ranches, and hunting land for sale with acreage filters.", monetization: "Free (realtor lead gen)", category: "Utility" },
  { name: "Wild Game Recipes", pitch: "Venison, duck, squirrel, and frog-leg recipes by season.", monetization: "Free + affiliate gear", category: "Utility" },
  { name: "Soil Test Reader", pitch: "Input soil sample results. TV explains N-P-K needs and lime.", monetization: "$1.99 one-time", category: "FFA" },
  { name: "Stock Dog Trials", pitch: "Border collie and Australian shepherd herding competition replays.", monetization: "Ad-supported", category: "Sports" },
  { name: "Solar Farm Planner", pitch: "ROI calculator, panel layout tips, and federal tax credit info.", monetization: "$2.99 one-time", category: "Utility" },
  { name: "Horse Auction", pitch: "Gaited horse, quarter horse, and draft auction previews.", monetization: "Free (affiliate links)", category: "FFA" },
  { name: "Night Sky Rural", pitch: "Live dark-sky camera feeds + astronomy guides for country stargazers.", monetization: "Free + tip jar", category: "Weather" },
  { name: "Chicken Coop TV", pitch: "Live coop cams, breed spotlights, and egg-count trackers.", monetization: "$0.99 one-time", category: "FFA" },
  { name: "Barrel Racing", pitch: "Runs, patterns, and training drills for barrel racers.", monetization: "$2.99/mo", category: "Sports" },
  { name: "Country Meme Wall", pitch: "Curated farm, redneck, and FFA memes. Slideshow format.", monetization: "Ad-supported", category: "Gaming" },
  { name: "Fence Builder", pitch: "Materials calculator, post spacing guide, and how-to videos.", monetization: "$1.99 one-time", category: "Utility" },
];

const CATEGORIES = Array.from(new Set(IDEAS.map((i) => i.category))).sort();

const STARTER_FILES = [
  { path: "manifest", content: `title=CriderGPT Sample Channel
major_version=1
minor_version=0
build_version=00001
mm_icon_focus_hd=pkg:/images/icon_focus_hd.png
mm_icon_side_hd=pkg:/images/icon_side_hd.png
splash_screen_hd=pkg:/images/splash_hd.png
ui_resolutions=hd
` },
  { path: "source/main.brs", content: `sub Main()
    showChannelSGScreen()
end sub

sub showChannelSGScreen()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("MainScene")
    screen.show()

    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent" then
            if msg.isScreenClosed() then return
        end if
    end while
end sub
` },
  { path: "components/MainScene.xml", content: `<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript">
        <![CDATA[
        sub init()
            m.top.backgroundURI = ""
            m.top.backgroundColor = "0x101015FF"
            label = m.top.findNode("title")
            label.text = "Hello from CriderGPT"
        end sub
        ]]>
    </script>
    <children>
        <Label id="title"
               width="1280" height="80"
               translation="[0, 320]"
               horizAlign="center"
               color="0xFFFFFFFF"
               font="font:LargeBoldSystemFont" />
    </children>
</component>
` },
];

const SIDELOAD_STEPS = [
  "Enable Developer Mode on your Roku: Home x3 → Up x2 → Right → Left → Right → Left → Right. Set a dev password, note the IP it shows.",
  "Zip the channel folder (manifest at root, NOT inside another folder).",
  "Go to http://YOUR-ROKU-IP/ in a browser, sign in (rokudev + your password).",
  "Upload the ZIP → click Install. Channel launches on TV instantly.",
  "Iterate: edit code → re-zip → re-upload. Roku keeps your dev channel until you replace it.",
];

export default function RokuStudio() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };
  const downloadChannel = async (channelId: string) => {
    const ch = ROKU_CHANNELS.find((c) => c.id === channelId);
    if (!ch) return;
    const zip = new JSZip();
    ch.files.forEach((f) => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ch.id}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: `${ch.name} downloaded`, description: "Replace the .TODO image files, then sideload to your Roku." });
  };
  const filteredIdeas = activeCategory === "All" ? IDEAS : IDEAS.filter((i) => i.category === activeCategory);

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
                  <Tv className="w-6 h-6 text-primary" />
                  Roku Channel Studio
                </h1>
                <p className="text-sm text-muted-foreground">
                  Everything you need to research, build, and publish Roku channels.
                </p>
              </div>
            </div>
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
              Free dev account · No annual fee
            </Badge>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Is Roku worth it?</CardTitle>
              <CardDescription className="text-xs space-y-2">
                <p><b>Pros:</b> Free dev account, no annual fee (unlike Apple's $99/yr), tiny competition in niche categories,
                Roku Pay handles subscriptions for you, and a TV-shaped audience that actually pays for utility apps.</p>
                <p><b>Cons:</b> BrightScript is a quirky language (not React/Kotlin/Swift), the UI framework (SceneGraph)
                has a learning curve, and ad-supported only really pays at scale. Best for niche video channels, audio streamers,
                or companion apps to something you already make (FFA, livestock, recipes).</p>
                <p><b>Verdict:</b> Worth a weekend experiment. Ship one tiny niche channel, see if it sticks, then scale.</p>
              </CardDescription>
            </CardHeader>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-3">Official resources</h2>
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
          </div>

          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <h2 className="text-lg font-semibold">Channel ideas you could ship</h2>
              <span className="text-xs text-muted-foreground">{IDEAS.length} ideas</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
              <Button
                size="sm"
                variant={activeCategory === "All" ? "default" : "outline"}
                onClick={() => setActiveCategory("All")}
                className="shrink-0"
              >
                <Filter className="w-3 h-3 mr-1" /> All
              </Button>
              {CATEGORIES.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={activeCategory === c ? "default" : "outline"}
                  onClick={() => setActiveCategory(c)}
                  className="shrink-0"
                >
                  {c}
                </Button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIdeas.map((i) => (
                <Card key={i.name} className="hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{i.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{i.category}</Badge>
                    </div>
                    <CardDescription className="text-xs">{i.pitch}</CardDescription>
                    <div className="text-xs text-primary font-medium pt-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {i.monetization}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hello-world starter (BrightScript + SceneGraph)</CardTitle>
              <CardDescription className="text-xs">
                Drop these three files into a folder, zip it, and sideload. You'll see "Hello from CriderGPT" on your TV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {STARTER_FILES.map((f) => (
                <div key={f.path} className="border rounded-md">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <code className="text-xs font-mono">{f.path}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(f.content, f.path)}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="text-xs p-3 overflow-x-auto max-h-72"><code>{f.content}</code></pre>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sideload to your TV (5 steps)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {SIDELOAD_STEPS.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex-1 text-muted-foreground">{s}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing cheat sheet</CardTitle>
              <CardDescription className="text-xs">What works for Roku channels in 2026.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><b>Free + Roku Ads (RAF):</b> Best for video-heavy channels. Needs scale to pay.</p>
              <p><b>$1.99 - $4.99 one-time:</b> Sweet spot for niche utilities (workshop cam, recipe reader).</p>
              <p><b>$2.99 - $9.99 / month via Roku Pay:</b> Best for ongoing content (live events, archives). Roku keeps 20% Y1, 15% after.</p>
              <p><b>Private (beta) channels:</b> Skip certification entirely. Share a code with friends/family. Free, instant.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
