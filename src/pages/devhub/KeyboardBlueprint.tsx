import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Keyboard, Wifi, Lightbulb, MousePointer, Zap,
  Layers, Battery, Cpu, DollarSign, Clock, HardDrive, Shield, Radio
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Transparent Chassis",
    desc: "Laser-cut 5mm polycarbonate base plate with frosted acrylic diffuser layers. The entire body is see-through — you see the PCB, switches, and lighting from every angle.",
    spec: "Material: Polycarbonate + Frosted Acrylic",
    glow: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/30",
  },
  {
    icon: Lightbulb,
    title: "Per-Key Adaptive Lighting",
    desc: "Every key has its own RGB LED that can glow independently. Certain keys light up based on context — Enter pulses green when data syncs, numbers flash red for low inventory, WASD glows for gaming mode.",
    spec: "LEDs: WS2812B-mini, 104 individually addressable",
    glow: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    icon: MousePointer,
    title: "Integrated Trackpad Panel",
    desc: "A glass-covered capacitive trackpad built into the right-side number pad zone. Replaces your mouse entirely when desk space is tight. Supports multi-finger gestures and pressure sensitivity.",
    spec: "Sensor: TTP224 4-channel capacitive touch IC",
    glow: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    icon: Wifi,
    title: "Dual Wireless Connectivity",
    desc: "Connects via Bluetooth 5.2 for laptops and phones, or 2.4GHz USB dongle for gaming with sub-1ms latency. Seamlessly switch between up to 3 paired devices with a key combo.",
    spec: "Protocol: BLE 5.2 + 2.4GHz proprietary dongle",
    glow: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
  },
  {
    icon: Zap,
    title: "USB-C + Passthrough Hub",
    desc: "One cable powers the keyboard, charges the internal battery, and passes through data to a built-in USB-A 3.0 port on the back. Plug a flash drive or phone directly into your keyboard.",
    spec: "Ports: USB-C PD 65W input, USB-A 3.0 passthrough",
    glow: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
  },
  {
    icon: Battery,
    title: "Wireless Power System",
    desc: "4000mAh Li-Po battery hidden in the rear housing, good for 40+ hours with lights on, or 120+ hours with lighting disabled. Qi wireless charging pad compatible — just set it down.",
    spec: "Battery: 3.7V 4000mAh, Qi wireless charging coil",
    glow: "from-lime-500/20 to-green-500/20",
    border: "border-lime-500/30",
  },
];

const partsList = [
  { name: "Polycarbonate base plate (3×)", category: "Chassis", est: "$35" },
  { name: "Frosted acrylic diffuser layers (2×)", category: "Chassis", est: "$20" },
  { name: "Gateron Clear switches (110-pack)", category: "Switches", est: "$45" },
  { name: "Clear/transparent keycaps (full set)", category: "Keycaps", est: "$40" },
  { name: "WS2812B-mini LEDs (110-pack)", category: "Electronics", est: "$18" },
  { name: "Nice!Nano v2 (wireless controller)", category: "Electronics", est: "$25" },
  { name: "TTP224 capacitive touch module", category: "Electronics", est: "$6" },
  { name: "TP4056 Li-Po charging module", category: "Electronics", est: "$4" },
  { name: "3.7V 4000mAh Li-Po flat battery", category: "Battery", est: "$18" },
  { name: "Qi wireless receiver coil", category: "Battery", est: "$12" },
  { name: "USB-C PD breakout board", category: "Electronics", est: "$8" },
  { name: "USB-A 3.0 passthrough module", category: "Electronics", est: "$10" },
  { name: "2.4GHz NRF52840 USB dongle", category: "Wireless", est: "$15" },
  { name: "Rubber anti-slip feet (8-pack)", category: "Hardware", est: "$5" },
  { name: "M3 brass standoffs + screws", category: "Hardware", est: "$8" },
];

const serverIdeas = [
  {
    icon: Shield,
    title: "Network-Wide Ad Blocker (AdGuard Home)",
    desc: "Block ads and trackers on EVERY device in your house — phones, TVs, smart fridges, everything. One Docker container, network-wide protection.",
    why: "You already run a 4-container stack. This is the #1 QoL upgrade.",
  },
  {
    icon: Radio,
    title: "Personal VPN (WireGuard)",
    desc: "Remote access to your server from anywhere. Secure your phone on sketchy public WiFi, access your files remotely, or tunnel into your home network.",
    why: "Takes 10 min to set up with wg-easy Docker. Free. No subscription.",
  },
  {
    icon: HardDrive,
    title: "Media Server (Jellyfin)",
    desc: "Self-hosted Netflix for your movie/TV collection. You already have XTTS-v2 and MusicGen — might as well stream it all from one place.",
    why: "You have the media engine. Now give it a front end.",
  },
  {
    icon: Cpu,
    title: "Service Monitor (Uptime Kuma)",
    desc: "Dashboard that pings all your containers every 30 seconds and texts/emails you when something crashes. Know before your users do.",
    why: "You have a lot of moving parts now. Monitor them.",
  },
];

export default function KeyboardBlueprint() {
  const totalEst = partsList.reduce((sum, p) => {
    const n = parseFloat(p.est.replace("$", ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <>
      <Helmet>
        <title>Project AETHER — Transparent Keyboard Blueprint | CriderGPT</title>
        <meta name="description" content="Concept blueprint for a futuristic see-through wireless keyboard with per-key adaptive lighting and integrated trackpad panel." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/devhub">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> DevHub
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                <h1 className="text-base font-semibold tracking-tight">Project AETHER</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              Concept Phase
            </Badge>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Hardware Concept</Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-cyan-400 via-primary to-amber-400 bg-clip-text text-transparent">
                AETHER
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A fully transparent, wireless mechanical keyboard with per-key adaptive RGB lighting
                and a built-in glass trackpad panel. Inspired by the tech of <em>The 100</em> — 
                something that looks like it came from the future, but built with parts you can order today.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Badge variant="secondary"><Wifi className="h-3 w-3 mr-1" /> Wireless</Badge>
                <Badge variant="secondary"><Lightbulb className="h-3 w-3 mr-1" /> Adaptive RGB</Badge>
                <Badge variant="secondary"><MousePointer className="h-3 w-3 mr-1" /> Trackpad</Badge>
                <Badge variant="secondary"><Layers className="h-3 w-3 mr-1" /> See-Through</Badge>
              </div>
            </div>
            {/* Decorative keyboard silhouette */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block opacity-10">
              <Keyboard className="w-64 h-64" strokeWidth={0.5} />
            </div>
          </section>

          {/* Feature Grid */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Core Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.title} className={`border ${f.border} bg-gradient-to-br ${f.glow} backdrop-blur`}>
                    <CardHeader className="pb-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                      <p className="text-xs text-primary font-medium">{f.spec}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Parts List */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" /> Parts & Cost Breakdown
            </h3>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-4">Part</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-right py-3 px-4">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partsList.map((p, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4 font-medium">{p.name}</td>
                          <td className="py-2.5 px-4"><Badge variant="outline" className="text-[10px]">{p.category}</Badge></td>
                          <td className="py-2.5 px-4 text-right text-muted-foreground">{p.est}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr>
                        <td className="py-3 px-4 font-bold" colSpan={2}>Total Estimated Build Cost</td>
                        <td className="py-3 px-4 text-right font-bold text-primary">~${totalEst}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Prices are rough estimates based on AliExpress / Amazon / Digi-Key. You could knock $50+ off by sourcing from bulk Chinese suppliers or skipping the Qi wireless charging.
            </p>
          </section>

          {/* Build Timeline */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Build Roadmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { phase: "Phase 1", title: "Design & CAD", status: "Done (in your head)", desc: "Sketch layout, measure key spacing, plan layer stack." },
                { phase: "Phase 2", title: "Order Parts", status: "Blocked — no funds", desc: "Order PCBs, acrylic, switches, and controller. ~$269 total." },
                { phase: "Phase 3", title: "Assembly", status: "Future", desc: "Solder LEDs, flash Nice!Nano firmware, stack acrylic layers." },
                { phase: "Phase 4", title: "Firmware & Polish", status: "Future", desc: "ZMK firmware for wireless, lighting profiles, trackpad gestures." },
              ].map((phase) => (
                <Card key={phase.phase} className="border-border/60">
                  <CardHeader className="pb-2">
                    <Badge variant={phase.status.includes("Done") ? "default" : phase.status.includes("Blocked") ? "destructive" : "outline"} className="w-fit mb-1 text-[10px]">
                      {phase.status}
                    </Badge>
                    <CardTitle className="text-sm">{phase.phase}: {phase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{phase.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Server Expansion Ideas */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" /> While You're Dreaming — Server Upgrades
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              You said you were wondering what else to throw on that AMD Ryzen server. Here's four actually-useful containers that cost $0 and run on what you already have:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serverIdeas.map((idea) => {
                const Icon = idea.icon;
                return (
                  <Card key={idea.title} className="border-border/60 hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">Free</Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">{idea.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{idea.desc}</p>
                      <p className="text-xs text-primary font-medium">{idea.why}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Footer Note */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              This is a concept document. Nothing here is for sale. If you ever build it, you have the receipts.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Project AETHER — conceived by Jessie Crider, documented by CriderGPT.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
