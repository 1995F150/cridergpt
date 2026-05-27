import { useEffect, useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plug, Upload, Save, Trash2, Plus, Vibrate, MousePointer2, Layers, Wifi, WifiOff, Pencil
} from "lucide-react";

type Key = { id: string; label: string; w: number; h: number; row: number; col: number };
type Layout = { id: string; name: string; keys: Key[] };

const STORAGE_KEY = "aether_layouts_v1";
const SETTINGS_KEY = "aether_settings_v1";
const BRIDGE_KEY = "aether_bridge_url_v1";

const DEFAULT_LAYOUT: Layout = {
  id: "default",
  name: "Default QWERTY",
  keys: [
    ..."`1234567890-=".split("").map((c, i) => ({ id: `r0-${i}`, label: c, w: 1, h: 1, row: 0, col: i })),
    ..."QWERTYUIOP[]".split("").map((c, i) => ({ id: `r1-${i}`, label: c, w: 1, h: 1, row: 1, col: i })),
    ..."ASDFGHJKL;'".split("").map((c, i) => ({ id: `r2-${i}`, label: c, w: 1, h: 1, row: 2, col: i })),
    ..."ZXCVBNM,./".split("").map((c, i) => ({ id: `r3-${i}`, label: c, w: 1, h: 1, row: 3, col: i })),
    { id: "space", label: "SPACE", w: 6, h: 1, row: 4, col: 2 },
  ],
};

const PRESETS: Layout[] = [
  DEFAULT_LAYOUT,
  {
    id: "fs25",
    name: "Farm Sim 25",
    keys: [
      ..."WASD".split("").map((c, i) => ({ id: `fs-${i}`, label: c, w: 1, h: 1, row: 1, col: i + 1 })),
      { id: "fs-e", label: "E (enter)", w: 1, h: 1, row: 1, col: 5 },
      { id: "fs-r", label: "R (refuel)", w: 1, h: 1, row: 1, col: 6 },
      { id: "fs-x", label: "X (lift)", w: 1, h: 1, row: 2, col: 1 },
      { id: "fs-b", label: "B (PTO)", w: 1, h: 1, row: 2, col: 2 },
      { id: "fs-space", label: "SPACE", w: 4, h: 1, row: 3, col: 1 },
    ],
  },
  {
    id: "coding",
    name: "Coding (CriderGPT)",
    keys: [
      { id: "c-tab", label: "TAB", w: 1, h: 1, row: 0, col: 0 },
      { id: "c-esc", label: "ESC", w: 1, h: 1, row: 0, col: 1 },
      { id: "c-{", label: "{", w: 1, h: 1, row: 0, col: 2 },
      { id: "c-}", label: "}", w: 1, h: 1, row: 0, col: 3 },
      { id: "c-(", label: "(", w: 1, h: 1, row: 0, col: 4 },
      { id: "c-)", label: ")", w: 1, h: 1, row: 0, col: 5 },
      { id: "c-;", label: ";", w: 1, h: 1, row: 1, col: 0 },
      { id: "c-arrow", label: "=>", w: 1, h: 1, row: 1, col: 1 },
    ],
  },
];

export default function AetherControl() {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<Layout[]>(PRESETS);
  const [activeId, setActiveId] = useState<string>("default");
  const [bridgeUrl, setBridgeUrl] = useState<string>(localStorage.getItem(BRIDGE_KEY) || "ws://localhost:8787");
  const [connected, setConnected] = useState(false);
  const [hapticStrength, setHapticStrength] = useState(60);
  const [trackpadSensitivity, setTrackpadSensitivity] = useState(70);
  const [hapticOn, setHapticOn] = useState(true);
  const [autoSwitchByApp, setAutoSwitchByApp] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Layout[];
        if (Array.isArray(parsed) && parsed.length) setLayouts(parsed);
      } catch {}
    }
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      try {
        const p = JSON.parse(s);
        setHapticStrength(p.hapticStrength ?? 60);
        setTrackpadSensitivity(p.trackpadSensitivity ?? 70);
        setHapticOn(p.hapticOn ?? true);
        setAutoSwitchByApp(p.autoSwitchByApp ?? false);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  }, [layouts]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ hapticStrength, trackpadSensitivity, hapticOn, autoSwitchByApp })
    );
  }, [hapticStrength, trackpadSensitivity, hapticOn, autoSwitchByApp]);

  const active = layouts.find((l) => l.id === activeId) ?? layouts[0];
  const rows = Math.max(5, ...active.keys.map((k) => k.row + 1));

  const tryConnect = async () => {
    localStorage.setItem(BRIDGE_KEY, bridgeUrl);
    try {
      const ws = new WebSocket(bridgeUrl);
      const t = setTimeout(() => {
        ws.close();
        setConnected(false);
        toast({ title: "No bridge", description: "Couldn't reach AETHER bridge. Run the firmware bridge on the device.", variant: "destructive" });
      }, 2500);
      ws.onopen = () => {
        clearTimeout(t);
        setConnected(true);
        toast({ title: "Connected", description: "AETHER bridge online." });
        ws.close();
      };
      ws.onerror = () => {
        clearTimeout(t);
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }
  };

  const pushLayout = async () => {
    try {
      const ws = new WebSocket(bridgeUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "layout", layout: active, settings: { hapticStrength, trackpadSensitivity, hapticOn } }));
        toast({ title: "Pushed", description: `Sent "${active.name}" to AETHER.` });
        ws.close();
      };
      ws.onerror = () => {
        toast({ title: "Push failed", description: "Bridge not reachable.", variant: "destructive" });
      };
    } catch {
      toast({ title: "Push failed", variant: "destructive" });
    }
  };

  const addKey = () => {
    if (!active) return;
    const newKey: Key = { id: `k-${Date.now()}`, label: "NEW", w: 1, h: 1, row: rows, col: 0 };
    setLayouts((ls) => ls.map((l) => (l.id === active.id ? { ...l, keys: [...l.keys, newKey] } : l)));
  };

  const updateKey = (id: string, patch: Partial<Key>) => {
    setLayouts((ls) =>
      ls.map((l) =>
        l.id === active.id ? { ...l, keys: l.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)) } : l
      )
    );
  };

  const removeKey = (id: string) => {
    setLayouts((ls) =>
      ls.map((l) => (l.id === active.id ? { ...l, keys: l.keys.filter((k) => k.id !== id) } : l))
    );
  };

  const newLayout = () => {
    const id = `layout-${Date.now()}`;
    setLayouts((ls) => [...ls, { id, name: "Untitled", keys: [] }]);
    setActiveId(id);
  };

  const deleteLayout = () => {
    if (layouts.length <= 1) return;
    setLayouts((ls) => ls.filter((l) => l.id !== activeId));
    setActiveId(layouts[0].id);
  };

  const exportLayout = () => {
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aether-${active.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DevHubPage title="AETHER Control Panel" subtitle="Design layouts, tune haptics, push to the glass.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device link */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="w-4 h-4 text-primary" /> Device Bridge
              </CardTitle>
              <Badge variant={connected ? "default" : "outline"} className={connected ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}>
                {connected ? <><Wifi className="w-3 h-3 mr-1" /> Online</> : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">Bridge WebSocket URL</Label>
              <Input value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} placeholder="ws://localhost:8787" />
            </div>
            <Button variant="outline" onClick={tryConnect}>Test Connect</Button>
            <Button onClick={pushLayout}><Upload className="w-4 h-4 mr-2" /> Push Layout</Button>
          </CardContent>
        </Card>

        {/* Layout designer */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Layout Designer
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={newLayout}><Plus className="w-3 h-3 mr-1" /> New</Button>
                <Button size="sm" variant="outline" onClick={exportLayout}><Save className="w-3 h-3 mr-1" /> Export</Button>
                <Button size="sm" variant="outline" onClick={deleteLayout} disabled={layouts.length <= 1}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={activeId} onValueChange={setActiveId}>
              <TabsList className="flex flex-wrap h-auto">
                {layouts.map((l) => (
                  <TabsTrigger key={l.id} value={l.id} className="text-xs">{l.name}</TabsTrigger>
                ))}
              </TabsList>
              {layouts.map((l) => (
                <TabsContent key={l.id} value={l.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={l.name}
                      onChange={(e) =>
                        setLayouts((ls) => ls.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))
                      }
                      className="h-8 max-w-xs"
                    />
                    <Button size="sm" variant="ghost" onClick={addKey}><Plus className="w-3 h-3 mr-1" /> Add key</Button>
                  </div>

                  {/* Preview grid */}
                  <div className="rounded-lg border border-border bg-card/40 p-4 overflow-x-auto">
                    <div
                      className="grid gap-1 min-w-[600px]"
                      style={{
                        gridTemplateColumns: "repeat(13, minmax(36px, 1fr))",
                        gridTemplateRows: `repeat(${rows}, 42px)`,
                      }}
                    >
                      {l.keys.map((k) => (
                        <button
                          key={k.id}
                          onClick={() => setEditingKeyId(editingKeyId === k.id ? null : k.id)}
                          className={`rounded-md border text-xs font-medium transition-colors ${
                            editingKeyId === k.id
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border bg-secondary/40 hover:bg-secondary/70 text-foreground"
                          }`}
                          style={{
                            gridColumn: `${k.col + 1} / span ${k.w}`,
                            gridRow: `${k.row + 1} / span ${k.h}`,
                          }}
                          title={`row ${k.row}, col ${k.col}`}
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editor for selected key */}
                  {editingKeyId && (() => {
                    const k = l.keys.find((x) => x.id === editingKeyId);
                    if (!k) return null;
                    return (
                      <div className="rounded-md border border-border p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                        <div className="col-span-2">
                          <Label className="text-xs flex items-center gap-1"><Pencil className="w-3 h-3" /> Label</Label>
                          <Input value={k.label} onChange={(e) => updateKey(k.id, { label: e.target.value })} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">Row</Label>
                          <Input type="number" min={0} value={k.row} onChange={(e) => updateKey(k.id, { row: Math.max(0, +e.target.value) })} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">Col</Label>
                          <Input type="number" min={0} value={k.col} onChange={(e) => updateKey(k.id, { col: Math.max(0, +e.target.value) })} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input type="number" min={1} max={13} value={k.w} onChange={(e) => updateKey(k.id, { w: Math.max(1, +e.target.value) })} className="h-8" />
                        </div>
                        <div className="col-span-2 sm:col-span-5">
                          <Button size="sm" variant="destructive" onClick={() => { removeKey(k.id); setEditingKeyId(null); }}>
                            <Trash2 className="w-3 h-3 mr-1" /> Remove key
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Vibrate className="w-4 h-4 text-primary" /> Feel & Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Haptic buzz</Label>
                <p className="text-xs text-muted-foreground">Vibration under every tap</p>
              </div>
              <Switch checked={hapticOn} onCheckedChange={setHapticOn} />
            </div>

            <div>
              <Label className="text-xs">Haptic strength: {hapticStrength}%</Label>
              <Slider value={[hapticStrength]} onValueChange={(v) => setHapticStrength(v[0])} max={100} step={5} disabled={!hapticOn} />
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Trackpad sensitivity: {trackpadSensitivity}%</Label>
              <Slider value={[trackpadSensitivity]} onValueChange={(v) => setTrackpadSensitivity(v[0])} max={100} step={5} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <Label className="text-sm">Auto-switch layout</Label>
                <p className="text-xs text-muted-foreground">Change layout based on focused app</p>
              </div>
              <Switch checked={autoSwitchByApp} onCheckedChange={setAutoSwitchByApp} />
            </div>

            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Settings save locally and ship with the next layout push.
            </div>
          </CardContent>
        </Card>

        {/* Firmware repo note */}
        <Card className="lg:col-span-3 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Firmware Repo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>The on-glass UI runs from a separate firmware repo scaffolded at <code className="text-primary">public/aether-firmware/</code>.</p>
            <p>It exposes a local WebSocket bridge (default <code>ws://localhost:8787</code>) that this panel pushes layouts and settings to. Flash it to the Pi / ESP32-S3 driving the glass.</p>
            <p className="text-xs">README + starter LVGL skeleton + bridge.py live in that folder.</p>
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
