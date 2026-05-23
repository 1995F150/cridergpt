import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Keyboard, Wifi, Lightbulb, MousePointer, Zap,
  Layers, Battery, Cpu, DollarSign, Clock, Vibrate, Smartphone
} from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "Full Glass Touchscreen Surface",
    desc: "The entire typing area is one big LCD touchscreen — like a phone keyboard but desk-sized. No physical keys, no moving parts. The layout is drawn in pixels, so you can swap between QWERTY, Dvorak, a piano, a Photoshop shortcut grid, or a custom FFA livestock entry pad on the fly.",
    spec: "Display: 14\" 1920×720 capacitive touchscreen LCD",
    glow: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/30",
  },
  {
    icon: Vibrate,
    title: "Haptic Buzz Feedback",
    desc: "A tiny linear vibration motor lives under the glass. Every time your finger lands on a key, it gives a sharp little click-buzz so your brain registers the press — same trick the iPhone trackpad uses. Feels like real keys without any of the wear.",
    spec: "Motor: LRA linear resonant actuator (Taptic-style)",
    glow: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    icon: MousePointer,
    title: "Dedicated Trackpad Zone (Corner)",
    desc: "Bottom-right corner has its own smaller dedicated screen — about the size of a laptop trackpad. Always-on cursor control, multi-finger gestures, pressure-sensitive clicks. Keeps the typing area clean while still killing your need for a mouse.",
    spec: "Zone: 4\" × 3\" secondary touchscreen panel",
    glow: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    icon: Lightbulb,
    title: "Context-Aware Key Layouts",
    desc: "Since the keys are just pixels, the keyboard rearranges itself based on what app you're in. Gaming pulls up WASD + hotbar. Photoshop shows brush/layer shortcuts. Chat mode brings up emojis. CriderGPT mode shows your saved AI prompt shortcuts.",
    spec: "Software: ZMK + custom layout profiles",
    glow: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
  },
  {
    icon: Wifi,
    title: "Dual Wireless + USB-C",
    desc: "Bluetooth 5.2 for laptops and phones, 2.4GHz dongle for sub-1ms gaming latency, or just plug in USB-C for power + data. Pair up to 3 devices and swap with a gesture on the trackpad zone.",
    spec: "Protocol: BLE 5.2 + 2.4GHz NRF52840 + USB-C",
    glow: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
  },
  {
    icon: Battery,
    title: "All-Day Battery + Qi Charging",
    desc: "5000mAh battery hidden behind the screen. ~12 hours of full-brightness use, or 24+ hours in low-power monochrome mode. Drop it on a Qi pad overnight, no cables.",
    spec: "Battery: 3.7V 5000mAh Li-Po + Qi receiver coil",
    glow: "from-lime-500/20 to-green-500/20",
    border: "border-lime-500/30",
  },
];

const partsList = [
  { name: "14\" 1920×720 capacitive touchscreen LCD", category: "Display", est: "$120" },
  { name: "4\" secondary touchscreen panel (trackpad zone)", category: "Display", est: "$28" },
  { name: "Tempered glass overlay (cut-to-size)", category: "Chassis", est: "$25" },
  { name: "Aluminum CNC frame + back plate", category: "Chassis", est: "$45" },
  { name: "LRA haptic vibration motor (×4 distributed)", category: "Haptics", est: "$16" },
  { name: "Haptic driver IC (DRV2605L)", category: "Haptics", est: "$6" },
  { name: "Raspberry Pi Zero 2W (display controller)", category: "Electronics", est: "$15" },
  { name: "Nice!Nano v2 (BLE keyboard controller)", category: "Electronics", est: "$25" },
  { name: "TP4056 Li-Po charging module", category: "Electronics", est: "$4" },
  { name: "3.7V 5000mAh Li-Po flat battery", category: "Battery", est: "$22" },
  { name: "Qi wireless receiver coil", category: "Battery", est: "$12" },
  { name: "USB-C PD breakout board", category: "Electronics", est: "$8" },
  { name: "2.4GHz NRF52840 USB dongle", category: "Wireless", est: "$15" },
  { name: "Rubber anti-slip feet (8-pack)", category: "Hardware", est: "$5" },
  { name: "M3 brass standoffs + screws", category: "Hardware", est: "$8" },
];

const layoutProfiles = [
  { name: "QWERTY Classic", desc: "Standard typing layout with a number row." },
  { name: "Gaming Mode", desc: "WASD highlighted, hotbar 1-9 enlarged, mouse zone activates." },
  { name: "FFA Livestock Entry", desc: "Quick-tap buttons for tag scan, weight, breed, notes." },
  { name: "CriderGPT Prompts", desc: "Your saved AI shortcuts and slash commands as big buttons." },
  { name: "Photoshop / Editor", desc: "Brush size, layer toggles, undo/redo as dedicated keys." },
  { name: "Piano / MIDI", desc: "Two octaves of touch piano keys for music apps." },
];

export default function KeyboardBlueprint() {
  const totalEst = partsList.reduce((sum, p) => {
    const n = parseFloat(p.est.replace("$", ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <>
      <Helmet>
        <title>Project AETHER — Touchscreen Keyboard Blueprint | CriderGPT</title>
        <meta name="description" content="Concept blueprint for a full touchscreen PC keyboard with haptic feedback and built-in digital trackpad — like a giant phone keyboard for your desk." />
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
              Concept Phase · v2
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
                A full-glass touchscreen keyboard for PCs — basically a phone keyboard, scaled up to desk size,
                with a built-in trackpad in the corner. No physical keys. Haptic buzz under every tap.
                The layout changes based on what you're doing. Built from parts you can actually order.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Badge variant="secondary"><Smartphone className="h-3 w-3 mr-1" /> Touchscreen</Badge>
                <Badge variant="secondary"><Vibrate className="h-3 w-3 mr-1" /> Haptic Feedback</Badge>
                <Badge variant="secondary"><MousePointer className="h-3 w-3 mr-1" /> Digital Trackpad</Badge>
                <Badge variant="secondary"><Wifi className="h-3 w-3 mr-1" /> Wireless</Badge>
              </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block opacity-10">
              <Smartphone className="w-64 h-64" strokeWidth={0.5} />
            </div>
          </section>

          {/* ASCII Layout Diagram */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Surface Layout
            </h3>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <pre className="text-[10px] sm:text-xs text-muted-foreground font-mono leading-tight overflow-x-auto">
{`┌──────────────────────────────────────────────────────────────────┐
│  [ESC] [F1] [F2] [F3] [F4] [F5] [F6] [F7] [F8] [F9] [F10] [DEL] │
│  [ \` ] [ 1] [ 2] [ 3] [ 4] [ 5] [ 6] [ 7] [ 8] [ 9] [ 0]  [⌫]   │
│  [TAB] [Q ] [W ] [E ] [R ] [T ] [Y ] [U ] [I ] [O ] [P ]  [\\]   │
│  [CAPS][A ] [S ] [D ] [F ] [G ] [H ] [J ] [K ] [L ] [;]   [⏎]   │
│  [⇧  ] [Z ] [X ] [C ] [V ] [B ] [N ] [M ] [,] [.] [/]    [⇧]    │
│  [CTL][WIN][ALT] [_________ SPACE _________] [ALT][FN]┌─────────┐│
│                                                       │ TRACKPAD ││
│                                                       │   ZONE   ││
│                                                       └─────────┘│
└──────────────────────────────────────────────────────────────────┘`}
                </pre>
                <p className="text-xs text-muted-foreground mt-3">
                  Main display area (left + center): full QWERTY drawn in pixels, swappable to any layout. Corner panel (right): always-on trackpad with multi-touch gestures.
                </p>
              </CardContent>
            </Card>
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

          {/* Layout Profiles */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Swappable Layout Profiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {layoutProfiles.map((p) => (
                <Card key={p.name} className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
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
              The 14" touchscreen is the big-ticket item. You can shave $40-60 by going with a 12" panel or sourcing a used phone/tablet LCD off iFixit.
            </p>
          </section>

          {/* Budget Tiers */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" /> Budget Tiers — Pick Your Route
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Cheap · ~$60</Badge>
                  <CardTitle className="text-sm mt-2">Screen-Only Build</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Plug straight into your PC over USB-C. PC does all the typing logic; the keyboard is literally just a 2nd touchscreen running a webpage.</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Salvaged 10" tablet LCD (eBay) — $30</li>
                    <li>USB-C touch controller — $12</li>
                    <li>Acrylic frame + feet — $10</li>
                    <li>Cables + screws — $8</li>
                  </ul>
                  <p className="text-[11px] text-emerald-400">No battery · No haptics · No wireless</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent ring-2 ring-amber-500/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="w-fit bg-amber-500/20 text-amber-300 border-amber-500/40">Mid · ~$140</Badge>
                    <Badge className="w-fit bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">YOUR PICK</Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">Wireless + Battery (Bluetooth)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pairs to your PC over plain Bluetooth — looks like any other BT keyboard to Windows. No USB dongle, no driver install. Battery lets you carry it room-to-room.</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>10" Waveshare HDMI+touch — $75</li>
                    <li>Raspberry Pi Zero 2W (the brain) — $15</li>
                    <li>3000mAh Li-Po + TP4056 charger — $22</li>
                    <li>Nice!Nano BLE HID module — $25</li>
                    <li>USB-C port (charging + backup wired mode) — $3</li>
                  </ul>
                  <p className="text-[11px] text-amber-400">BT 5.2 HID · 8–10 hr battery · No haptics yet</p>
                </CardContent>
              </Card>
              <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-cyan-500/20 text-cyan-300 border-cyan-500/40">Full · ~${totalEst}</Badge>
                  <CardTitle className="text-sm mt-2">Full AETHER Build</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Everything in the parts list — 14" main display, corner trackpad zone, haptic motors, Qi charging, CNC aluminum frame.</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Sells for $700–$1,000 retail-comparable</li>
                    <li>Profit per unit ≈ $350–650 if you parts-source bulk</li>
                    <li>Build time: ~14 hrs first unit, ~4 hrs after jig is made</li>
                  </ul>
                  <p className="text-[11px] text-cyan-400">Sell-worthy on Amazon / Etsy</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Recommendation: start with the <span className="text-emerald-400 font-semibold">$60 screen-only</span> as a working prototype. Prove the layout software, then upgrade the same chassis to wireless and haptics later.
            </p>
          </section>

          {/* Software & Languages */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" /> Software Stack & Languages
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Keyboard UI (the touchscreen layout)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Language:</span> TypeScript + React (same stack as CriderGPT — code re-uses your existing components).</p>
                  <p><span className="text-primary font-semibold">Renderer:</span> Runs as a kiosk-mode Chromium tab on the Pi. Full-screen, no browser chrome, boots straight in.</p>
                  <p><span className="text-primary font-semibold">Why:</span> You already know it. Layouts become React components. Profile swaps are state changes — instant.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Keypress → PC Bridge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Language:</span> C++ firmware on the Nice!Nano controller (via ZMK framework).</p>
                  <p><span className="text-primary font-semibold">Protocol:</span> HID over BLE 5.2 — looks like a regular Bluetooth keyboard to Windows/Mac/Linux. No driver install needed.</p>
                  <p><span className="text-primary font-semibold">Wired fallback:</span> USB-C HID composite (keyboard + mouse + touchscreen).</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Haptic Engine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Language:</span> Python service on the Pi listening over I²C to the DRV2605L driver.</p>
                  <p><span className="text-primary font-semibold">Patterns:</span> 123-effect library (sharp click, double tap, long buzz, error rumble). UI just sends an effect ID.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CriderGPT Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Connection:</span> WebSocket from the keyboard UI to <code className="text-[10px] bg-muted px-1">cridergpt.com</code>.</p>
                  <p><span className="text-primary font-semibold">Auth:</span> Same Supabase JWT your phone uses — scan a QR code from the app to pair.</p>
                  <p><span className="text-primary font-semibold">Sync:</span> Custom layouts, prompt shortcuts, and saved snippets all pull from your existing <code className="text-[10px] bg-muted px-1">ai_memory</code> table.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Local:</span> 16GB or 32GB microSD card in the Pi (~$8). Holds the OS, layout profiles, offline cache.</p>
                  <p><span className="text-primary font-semibold">Cloud:</span> Supabase row for synced profiles — same setup as the rest of CriderGPT.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">OTA Updates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><span className="text-primary font-semibold">Mechanism:</span> Pi polls a GitHub release URL every boot + every 6 hrs. New version = git pull + restart kiosk.</p>
                  <p><span className="text-primary font-semibold">Firmware:</span> ZMK supports DFU over USB — flash a new <code className="text-[10px] bg-muted px-1">.uf2</code> by dragging it onto the device when plugged in.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Build Timeline */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Build Roadmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { phase: "Phase 1", title: "Mock UI in Software", status: "Doable now", desc: "Build the touchscreen keyboard UI as a webpage that runs on any tablet. Test layouts, haptics, gestures." },
                { phase: "Phase 2", title: "Order Parts", status: "Blocked — no funds", desc: "Touchscreen LCD, Pi Zero 2W, haptic motors, battery, frame. ~$354 total." },
                { phase: "Phase 3", title: "Assembly", status: "Future", desc: "Mount LCD in CNC frame, wire haptic motors under glass, connect Pi + Nice!Nano controllers." },
                { phase: "Phase 4", title: "Firmware & Profiles", status: "Future", desc: "ZMK keyboard logic, layout profile engine, gesture recognizer for the trackpad corner." },
              ].map((phase) => (
                <Card key={phase.phase} className="border-border/60">
                  <CardHeader className="pb-2">
                    <Badge variant={phase.status.includes("Doable") ? "default" : phase.status.includes("Blocked") ? "destructive" : "outline"} className="w-fit mb-1 text-[10px]">
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

          {/* Pro/Con Reality Check */}
          <section>
            <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" /> Honest Trade-Offs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-400">Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Infinitely customizable layouts — one device, every app</li>
                    <li>No moving parts to wear out or get sticky</li>
                    <li>Spill-proof (it's just glass)</li>
                    <li>Looks like nothing else on the market</li>
                    <li>Built-in trackpad kills your need for a mouse</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-rose-400">Trade-offs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Touch typing without raised keys takes practice</li>
                    <li>Burns more battery than a mechanical board</li>
                    <li>Glass shows fingerprints fast</li>
                    <li>Haptic ≠ real key travel for hardcore gamers</li>
                    <li>Single point of failure — cracked screen = dead keyboard</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Footer Note */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              This is a concept document. Nothing here is for sale yet. If you ever build it, you have the receipts.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Project AETHER v2 — conceived by Jessie Crider, documented by CriderGPT.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
