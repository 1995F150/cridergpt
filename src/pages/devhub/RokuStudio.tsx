import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ExternalLink, Tv, DollarSign, BookOpen, Wrench, Rocket, Code2, Copy,
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
  { name: "FFA Show Watch", pitch: "Stream livestock auctions, fair coverage, and FFA event replays.", monetization: "Free + Roku Pay $2.99/mo for archives" },
  { name: "Farm Sim Highlights", pitch: "Curated FS25/FS22 mod showcases and tutorials, pulled from YouTube.", monetization: "Ad-supported via RAF" },
  { name: "Tractor Pull TV", pitch: "Niche channel for tractor pull events. License clips from local fairs.", monetization: "$3.99 one-time channel unlock" },
  { name: "Country Gospel Radio", pitch: "Audio-only channel streaming gospel + bluegrass radio stations.", monetization: "Free + tip jar" },
  { name: "Recipe Reader", pitch: "Big-screen recipe display synced with your CriderGPT recipe vault.", monetization: "Free (drives CriderGPT signups)" },
  { name: "Workshop Cam Viewer", pitch: "Stream a local IP camera (welding shop, barn) to your TV.", monetization: "$1.99 one-time" },
  { name: "Snow Day Cam", pitch: "Aggregates public weather + traffic cams by region.", monetization: "Ad-supported" },
  { name: "RDR2 Lore Channel", pitch: "Loop your RDR2 gamer-guide content as a video channel.", monetization: "Free + tip jar" },
  { name: "Auction Calendar", pitch: "TV-friendly list of upcoming livestock + equipment auctions in your area.", monetization: "Free (affiliate links to listings)" },
  { name: "Local High School Sports", pitch: "Embed YouTube live streams from local schools. Niche but loyal audience.", monetization: "Ad-supported" },
];

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
            <h2 className="text-lg font-semibold mb-3">Channel ideas you could ship</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {IDEAS.map((i) => (
                <Card key={i.name} className="hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="text-base">{i.name}</CardTitle>
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
