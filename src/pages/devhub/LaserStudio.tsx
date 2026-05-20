import { useEffect, useMemo, useRef, useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Download, Wifi, Save, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

// ---------- AlgoLaser material presets (power 0-100%, speed mm/min) ----------
const PRESETS: Record<string, { label: string; power: number; speed: number; passes: number; note: string }> = {
  basswood_engrave: { label: "Basswood — Engrave", power: 35, speed: 3000, passes: 1, note: "Light burn, good detail" },
  basswood_cut_3mm: { label: "Basswood 3mm — Cut", power: 100, speed: 350, passes: 3, note: "Slow, multi-pass" },
  plywood_cut_3mm: { label: "Plywood 3mm — Cut", power: 100, speed: 300, passes: 4, note: "Glue layers slow it down" },
  acrylic_black_engrave: { label: "Black Acrylic — Engrave", power: 45, speed: 2500, passes: 1, note: "Frosted etch effect" },
  acrylic_cut_3mm: { label: "Black Acrylic 3mm — Cut", power: 100, speed: 200, passes: 5, note: "Diode lasers struggle with clear" },
  leather_engrave: { label: "Leather — Engrave", power: 25, speed: 4000, passes: 1, note: "Veg-tan burns dark" },
  leather_cut: { label: "Leather 2-3mm — Cut", power: 80, speed: 600, passes: 2, note: "Watch for flare-up" },
  anodized_alu: { label: "Anodized Aluminum — Mark", power: 100, speed: 1200, passes: 1, note: "Removes dye coating" },
  slate_engrave: { label: "Slate Coaster — Engrave", power: 80, speed: 1500, passes: 1, note: "White contrast on dark slate" },
  cardboard_cut: { label: "Cardboard — Cut", power: 30, speed: 1500, passes: 1, note: "Fast — watch for fire" },
  paper_cut: { label: "Paper — Cut", power: 15, speed: 3000, passes: 1, note: "Air assist on" },
};

const MAT_KEY = "cridergpt-laser-materials-v1";
const SETTINGS_KEY = "cridergpt-laser-settings-v1";

interface CustomMaterial { id: string; name: string; power: number; speed: number; passes: number; note: string; }

// ---------- SVG → G-code (real path linearization via getPointAtLength) ----------
function svgToGcode(svgText: string, opts: { power: number; speed: number; feed: number; passes: number; samplesPerMm: number; flipY: boolean }) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  // Mount off-screen to enable getPointAtLength/getTotalLength
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;";
  host.appendChild(svg);
  document.body.appendChild(host);

  let viewBox = svg.viewBox?.baseVal;
  const widthAttr = parseFloat(svg.getAttribute("width") || "0") || viewBox?.width || 100;
  const heightAttr = parseFloat(svg.getAttribute("height") || "0") || viewBox?.height || 100;
  const vbW = viewBox?.width || widthAttr;
  const vbH = viewBox?.height || heightAttr;
  // Assume 1 user unit == 1 mm (typical for laser SVGs). If user designs in px, treat 1:1.

  const paths = Array.from(svg.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse"));
  const gcode: string[] = [];
  gcode.push("; CriderGPT Laser Studio — AlgoLaser GRBL");
  gcode.push(`; power=${opts.power}% speed=${opts.speed}mm/min passes=${opts.passes}`);
  gcode.push("G21 ; mm units");
  gcode.push("G90 ; absolute");
  gcode.push("M5 ; laser off");
  gcode.push(`G0 F${opts.feed}`);

  const sVal = Math.round((opts.power / 100) * 1000); // GRBL S0-1000

  // Convert SVG element to a single SVGGeometryElement we can sample by converting shapes to path data
  const toPath = (el: Element): SVGPathElement | null => {
    if (el.tagName.toLowerCase() === "path") return el as SVGPathElement;
    const ns = "http://www.w3.org/2000/svg";
    const p = document.createElementNS(ns, "path");
    const get = (a: string) => parseFloat(el.getAttribute(a) || "0");
    let d = "";
    switch (el.tagName.toLowerCase()) {
      case "line": d = `M ${get("x1")} ${get("y1")} L ${get("x2")} ${get("y2")}`; break;
      case "polyline":
      case "polygon": {
        const pts = (el.getAttribute("points") || "").trim().split(/\s+|,/).map(parseFloat);
        for (let i = 0; i < pts.length; i += 2) d += (i === 0 ? "M " : " L ") + pts[i] + " " + pts[i + 1];
        if (el.tagName.toLowerCase() === "polygon") d += " Z";
        break;
      }
      case "rect": {
        const x = get("x"), y = get("y"), w = get("width"), h = get("height");
        d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
        break;
      }
      case "circle": {
        const cx = get("cx"), cy = get("cy"), r = get("r");
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
        break;
      }
      case "ellipse": {
        const cx = get("cx"), cy = get("cy"), rx = get("rx"), ry = get("ry");
        d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
        break;
      }
      default: return null;
    }
    p.setAttribute("d", d);
    svg.appendChild(p);
    return p;
  };

  let totalDist = 0;
  for (let pass = 1; pass <= opts.passes; pass++) {
    gcode.push(`; ---- pass ${pass}/${opts.passes} ----`);
    for (const el of paths) {
      const path = toPath(el);
      if (!path) continue;
      let len = 0;
      try { len = path.getTotalLength(); } catch { continue; }
      if (!len || !isFinite(len)) continue;
      const step = Math.max(0.2, 1 / opts.samplesPerMm);
      const samples = Math.max(2, Math.ceil(len / step));
      // Move to start with laser off
      const start = path.getPointAtLength(0);
      const sx = start.x;
      const sy = opts.flipY ? (vbH - start.y) : start.y;
      gcode.push("M5");
      gcode.push(`G0 X${sx.toFixed(3)} Y${sy.toFixed(3)}`);
      gcode.push(`M3 S${sVal}`);
      gcode.push(`G1 F${opts.speed}`);
      let prev = start;
      for (let i = 1; i <= samples; i++) {
        const t = (i / samples) * len;
        const pt = path.getPointAtLength(t);
        const px = pt.x;
        const py = opts.flipY ? (vbH - pt.y) : pt.y;
        gcode.push(`G1 X${px.toFixed(3)} Y${py.toFixed(3)}`);
        totalDist += Math.hypot(pt.x - prev.x, pt.y - prev.y);
        prev = pt;
      }
      gcode.push("M5");
    }
  }

  gcode.push("M5 ; laser off");
  gcode.push("G0 X0 Y0 ; home");
  document.body.removeChild(host);

  // Time estimate: distance / speed (mm/min) → minutes
  const cuttingMin = totalDist / Math.max(1, opts.speed);
  const rapidMin = (paths.length * opts.passes * 0.05); // rough overhead per move
  const totalMin = cuttingMin + rapidMin;

  return {
    gcode: gcode.join("\n"),
    totalDistMm: totalDist,
    estimateMin: totalMin,
    workWidthMm: vbW,
    workHeightMm: vbH,
  };
}

export default function LaserStudio() {
  const [svgText, setSvgText] = useState("");
  const [filename, setFilename] = useState("engraving");
  const previewRef = useRef<HTMLDivElement>(null);

  const [presetKey, setPresetKey] = useState<string>("basswood_engrave");
  const [power, setPower] = useState(35);
  const [speed, setSpeed] = useState(3000);
  const [feed, setFeed] = useState(6000);
  const [passes, setPasses] = useState(1);
  const [samplesPerMm, setSamplesPerMm] = useState(4);
  const [flipY, setFlipY] = useState(true);

  const [generated, setGenerated] = useState<{ gcode: string; estimateMin: number; totalDistMm: number; workWidthMm: number; workHeightMm: number } | null>(null);

  // Wi-Fi sender
  const [laserHost, setLaserHost] = useState("");
  const [sending, setSending] = useState(false);

  // Material library
  const [materials, setMaterials] = useState<CustomMaterial[]>([]);
  const [matName, setMatName] = useState("");

  // Cost calc
  const [hourlyRate, setHourlyRate] = useState(15); // dollars per machine hour

  // ---- persist settings ----
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (saved.laserHost) setLaserHost(saved.laserHost);
      if (saved.hourlyRate) setHourlyRate(saved.hourlyRate);
    } catch {}
    try { setMaterials(JSON.parse(localStorage.getItem(MAT_KEY) || "[]")); } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ laserHost, hourlyRate }));
  }, [laserHost, hourlyRate]);

  const applyPreset = (key: string) => {
    setPresetKey(key);
    if (key.startsWith("custom:")) {
      const m = materials.find(mm => `custom:${mm.id}` === key);
      if (m) { setPower(m.power); setSpeed(m.speed); setPasses(m.passes); }
    } else {
      const p = PRESETS[key]; if (p) { setPower(p.power); setSpeed(p.speed); setPasses(p.passes); }
    }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    const text = await f.text();
    setSvgText(text);
    setFilename(f.name.replace(/\.svg$/i, "") || "engraving");
    if (previewRef.current) previewRef.current.innerHTML = text;
    setGenerated(null);
  };

  const generate = () => {
    if (!svgText) { toast.error("Upload an SVG first"); return; }
    try {
      const result = svgToGcode(svgText, { power, speed, feed, passes, samplesPerMm, flipY });
      setGenerated(result);
      toast.success(`G-code generated — ${result.estimateMin.toFixed(1)} min est.`);
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    }
  };

  const download = () => {
    if (!generated) return;
    const blob = new Blob([generated.gcode], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.gcode`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sendOverWifi = async () => {
    if (!generated || !laserHost) { toast.error("Need G-code + engraver host"); return; }
    setSending(true);
    try {
      const base = laserHost.startsWith("http") ? laserHost : `http://${laserHost}`;
      // AlgoLaser / GRBL_ESP32 / FluidNC commonly accept /upload with multipart form
      const fd = new FormData();
      const blob = new Blob([generated.gcode], { type: "text/plain" });
      fd.append("file", blob, `${filename}.gcode`);
      const res = await fetch(`${base}/upload`, { method: "POST", body: fd, mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Uploaded to engraver. Start it from the touchscreen.");
    } catch (e: any) {
      toast.error("Send failed — make sure WLAN is ON and host/IP is right. " + e.message);
    } finally { setSending(false); }
  };

  const saveCurrentAsMaterial = () => {
    if (!matName.trim()) { toast.error("Name it first"); return; }
    const next: CustomMaterial[] = [
      { id: crypto.randomUUID(), name: matName, power, speed, passes, note: "Saved from current settings" },
      ...materials,
    ];
    setMaterials(next);
    localStorage.setItem(MAT_KEY, JSON.stringify(next));
    setMatName("");
    toast.success("Material saved");
  };
  const delMaterial = (id: string) => {
    const next = materials.filter(m => m.id !== id);
    setMaterials(next);
    localStorage.setItem(MAT_KEY, JSON.stringify(next));
  };

  const cost = useMemo(() => {
    if (!generated) return null;
    const hours = generated.estimateMin / 60;
    return { hours, dollars: hours * hourlyRate };
  }, [generated, hourlyRate]);

  return (
    <DevHubPage title="Laser Engraver Studio" subtitle="AlgoLaser-tuned · SVG → G-code · Wi-Fi sender · material library">
      <Tabs defaultValue="job" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="job">Job</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="device">Device</TabsTrigger>
        </TabsList>

        {/* ---------------- JOB TAB ---------------- */}
        <TabsContent value="job">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flame className="w-4 h-4" /> Job Setup</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>SVG File</Label>
                  <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
                <div>
                  <Label>Material Preset</Label>
                  <Select value={presetKey} onValueChange={applyPreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                      {materials.length > 0 && <SelectItem disabled value="_div">— Your saved —</SelectItem>}
                      {materials.map(m => (
                        <SelectItem key={m.id} value={`custom:${m.id}`}>★ {m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {PRESETS[presetKey] && <p className="text-[10px] text-muted-foreground mt-1">{PRESETS[presetKey].note}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Power %</Label><Input type="number" value={power} onChange={e => setPower(+e.target.value)} /></div>
                  <div><Label>Speed mm/m</Label><Input type="number" value={speed} onChange={e => setSpeed(+e.target.value)} /></div>
                  <div><Label>Passes</Label><Input type="number" value={passes} onChange={e => setPasses(+e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Rapid Feed</Label><Input type="number" value={feed} onChange={e => setFeed(+e.target.value)} /></div>
                  <div><Label>Samples/mm</Label><Input type="number" value={samplesPerMm} onChange={e => setSamplesPerMm(+e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={flipY} onChange={e => setFlipY(e.target.checked)} />
                  Flip Y (SVG top-left → laser bottom-left). Leave on for most engravers.
                </label>
                <div>
                  <Label>Output filename</Label>
                  <Input value={filename} onChange={e => setFilename(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={generate} className="flex-1">Generate G-code</Button>
                  <Button onClick={download} disabled={!generated} variant="secondary"><Download className="w-4 h-4" /></Button>
                </div>
                {cost && (
                  <div className="rounded bg-primary/10 border border-primary/30 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> Est. <b>{generated!.estimateMin.toFixed(1)} min</b> · {generated!.totalDistMm.toFixed(0)} mm travel</div>
                    <div>Work area: {generated!.workWidthMm.toFixed(0)} × {generated!.workHeightMm.toFixed(0)} mm</div>
                    <div>Cost @ ${hourlyRate}/hr machine time: <b>${cost.dollars.toFixed(2)}</b></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Preview / G-code</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div ref={previewRef} className="bg-white rounded p-4 min-h-[220px] flex items-center justify-center text-muted-foreground border">
                  {!svgText && "SVG preview appears here"}
                </div>
                {generated && (
                  <pre className="text-[10px] bg-muted/30 p-2 rounded max-h-[200px] overflow-auto font-mono">{generated.gcode.split("\n").slice(0, 40).join("\n")}{generated.gcode.split("\n").length > 40 ? "\n... (download for full)" : ""}</pre>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- MATERIALS TAB ---------------- */}
        <TabsContent value="materials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Save current settings as material</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Current: <b>{power}%</b> · <b>{speed} mm/m</b> · <b>{passes}</b> pass{passes > 1 ? "es" : ""}</p>
                <Input placeholder="Material name (e.g. Cherry 6mm cut)" value={matName} onChange={e => setMatName(e.target.value)} />
                <Button onClick={saveCurrentAsMaterial} className="w-full"><Save className="w-4 h-4 mr-2" /> Save</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Saved materials ({materials.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {materials.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No saved materials yet.</p>}
                {materials.map(m => (
                  <div key={m.id} className="flex justify-between items-center border border-border rounded p-2 text-xs">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-muted-foreground">{m.power}% · {m.speed} mm/m · {m.passes}x</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => applyPreset(`custom:${m.id}`)}>Use</Button>
                      <Button size="sm" variant="ghost" onClick={() => delMaterial(m.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- DEVICE TAB ---------------- */}
        <TabsContent value="device">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wifi className="w-4 h-4" /> AlgoLaser Wi-Fi Sender</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Engraver host / IP</Label>
                <Input placeholder="192.168.1.42  or  algolaser.local" value={laserHost} onChange={e => setLaserHost(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Find it on your engraver: <b>Settings → WLAN</b>. Make sure WLAN is ON (your photo confirms it is).</p>
              </div>
              <div>
                <Label>Machine cost rate ($/hr)</Label>
                <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(+e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Used for the per-job cost estimate.</p>
              </div>
              <Button onClick={sendOverWifi} disabled={!generated || !laserHost || sending} className="w-full">
                {sending ? "Uploading..." : "Send last G-code to engraver"}
              </Button>
              <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                <b>Fallback (if upload fails):</b> download the G-code, drop it onto the engraver's <b>Virtual USB Disk</b>, then start the job from the touchscreen. AlgoLaser firmware varies — some units only expose the USB disk, no HTTP upload.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DevHubPage>
  );
}
