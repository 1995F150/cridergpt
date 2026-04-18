import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Sparkles, Image as ImageIcon, Wand2, Box, Square, RectangleHorizontal, Layers } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_PARAMS,
  PRESETS,
  SUBTYPES,
  TextureParams,
  generateProceduralDiffuse,
  type MaterialCategory,
} from '@/lib/textures/procedural';
import { buildFullTextureSet, TextureSet } from '@/lib/textures/maps';
import { processPhoto } from '@/lib/textures/photo';
import { exportPng, exportTextureSetZip, validateTextureSet } from '@/lib/textures/export';
import { TexturePreview3D } from '@/components/textures/TexturePreview3D';

export function TexturesPanel() {
  const [params, setParams] = useState<TextureParams>(DEFAULT_PARAMS);
  const [set, setSet] = useState<TextureSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [shape, setShape] = useState<'plane' | 'cube' | 'wall' | 'floor'>('cube');
  const [viewMode, setViewMode] = useState<'final' | 'diffuse' | 'normal' | 'roughness'>('final');
  const [tileRepeat, setTileRepeat] = useState(1);
  const [mode, setMode] = useState<'procedural' | 'photo'>('procedural');
  const [textureName, setTextureName] = useState('crider_texture');
  const seedRef = useRef(1337);

  const update = <K extends keyof TextureParams>(key: K, value: TextureParams[K]) =>
    setParams(p => ({ ...p, [key]: value }));

  const generate = () => {
    setBusy(true);
    // Defer to next tick so spinner shows
    setTimeout(() => {
      try {
        const diffuse = generateProceduralDiffuse(params, seedRef.current);
        const full = buildFullTextureSet(diffuse, params.roughness, 2);
        setSet(full);
      } catch (e) {
        console.error(e);
        toast.error('Generation failed');
      } finally {
        setBusy(false);
      }
    }, 50);
  };

  const reroll = () => {
    seedRef.current = Math.floor(Math.random() * 1e9);
    generate();
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setParams(p => ({ ...p, ...preset }));
    toast.success(`Preset applied: ${name}`);
  };

  const handlePhoto = async (file: File) => {
    setBusy(true);
    try {
      const diffuse = await processPhoto(file, { size: params.size, flatten: true, tile: params.seamless });
      const full = buildFullTextureSet(diffuse, params.roughness, 2);
      setSet(full);
      toast.success('Photo processed: lighting flattened + seamless tiled');
    } catch (e) {
      console.error(e);
      toast.error('Photo processing failed');
    } finally {
      setBusy(false);
    }
  };

  const exportZip = async () => {
    if (!set) return;
    const v = validateTextureSet(set);
    if (!v.ok) toast.warning(v.issues.join(' '));
    await exportTextureSetZip(set, params, textureName, 'farming-simulator');
    toast.success('Texture pack exported');
  };

  // Generate once on mount
  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);
  // Auto-regen on param change (debounced)
  useEffect(() => {
    if (busy) return;
    const t = setTimeout(generate, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [params]);

  const subtypes = SUBTYPES[params.category];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Texture Generator</h1>
          <Badge variant="outline" className="text-xs">v1 · Local-first · 0 AI cost</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={textureName}
            onChange={(e) => setTextureName(e.target.value.replace(/[^a-z0-9_-]/gi, '_'))}
            className="h-8 w-44 text-sm"
            placeholder="texture_name"
          />
          <Button size="sm" variant="outline" onClick={reroll} disabled={busy}>
            <Sparkles className="h-4 w-4 mr-1" /> Reroll
          </Button>
          <Button size="sm" onClick={exportZip} disabled={!set || busy}>
            <Download className="h-4 w-4 mr-1" /> Export ZIP
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] min-h-0">
        {/* LEFT — Controls */}
        <Card className="rounded-none border-y-0 border-l-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="procedural"><Wand2 className="h-3 w-3 mr-1" />Procedural</TabsTrigger>
                <TabsTrigger value="photo"><ImageIcon className="h-3 w-3 mr-1" />Photo</TabsTrigger>
              </TabsList>

              <TabsContent value="procedural" className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs">Material</Label>
                  <Select value={params.category} onValueChange={(v) => {
                    const cat = v as MaterialCategory;
                    setParams(p => ({ ...p, category: cat, subtype: SUBTYPES[cat][0] }));
                  }}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(SUBTYPES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subtype</Label>
                  <Select value={params.subtype} onValueChange={(v) => update('subtype', v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subtypes.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Presets</Label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {Object.keys(PRESETS).map(name => (
                      <Button key={name} size="sm" variant="outline" className="h-7 text-xs justify-start" onClick={() => applyPreset(name)}>
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="photo" className="space-y-3 mt-4">
                <Label className="text-xs">Upload a photo (centered, square crop)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Lighting will be flattened and the result tiled seamlessly. Then PBR maps are derived in-browser.
                </p>
              </TabsContent>
            </Tabs>

            {/* Sliders */}
            <div className="space-y-3 pt-2 border-t border-border">
              <SliderRow label="Roughness" value={params.roughness} onChange={v => update('roughness', v)} />
              <SliderRow label="Wear" value={params.wear} onChange={v => update('wear', v)} />
              <SliderRow label="Damage" value={params.damage} onChange={v => update('damage', v)} />
              <SliderRow label="Dirt" value={params.dirt} onChange={v => update('dirt', v)} />
              <SliderRow label="Pattern density" value={params.patternDensity} max={2} onChange={v => update('patternDensity', v)} />
              <SliderRow label="Scale" value={params.scale} min={0.25} max={4} onChange={v => update('scale', v)} />
              <SliderRow label="Brightness" value={params.brightness} max={2} onChange={v => update('brightness', v)} />
              <SliderRow label="Contrast" value={params.contrast} max={2} onChange={v => update('contrast', v)} />
              <SliderRow label="Tint amount" value={params.tintAmount} onChange={v => update('tintAmount', v)} />
              <SliderRow label="Grain direction (deg)" value={params.grainDirection} max={360} onChange={v => update('grainDirection', v)} />
              <div>
                <Label className="text-xs">Tint color</Label>
                <input
                  type="color"
                  className="w-full h-8 rounded border border-border bg-background mt-1 cursor-pointer"
                  value={`#${[params.tintR, params.tintG, params.tintB].map(c => c.toString(16).padStart(2, '0')).join('')}`}
                  onChange={(e) => {
                    const hex = e.target.value.slice(1);
                    update('tintR', parseInt(hex.slice(0, 2), 16));
                    update('tintG', parseInt(hex.slice(2, 4), 16));
                    update('tintB', parseInt(hex.slice(4, 6), 16));
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Seamless tiling</Label>
                <Switch checked={params.seamless} onCheckedChange={(v) => update('seamless', v)} />
              </div>
              <div>
                <Label className="text-xs">Resolution</Label>
                <Select value={String(params.size)} onValueChange={(v) => update('size', parseInt(v))}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="256">256² (preview)</SelectItem>
                    <SelectItem value="512">512²</SelectItem>
                    <SelectItem value="1024">1024² (FS preset)</SelectItem>
                    <SelectItem value="2048">2048² (slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* CENTER — 3D Preview */}
        <div className="relative min-h-[400px] flex flex-col bg-muted/20">
          <div className="absolute top-2 left-2 z-10 flex gap-1 flex-wrap">
            <ShapeBtn active={shape === 'plane'} onClick={() => setShape('plane')} icon={<Square className="h-3 w-3" />} label="Plane" />
            <ShapeBtn active={shape === 'cube'} onClick={() => setShape('cube')} icon={<Box className="h-3 w-3" />} label="Cube" />
            <ShapeBtn active={shape === 'wall'} onClick={() => setShape('wall')} icon={<RectangleHorizontal className="h-3 w-3" />} label="Wall" />
            <ShapeBtn active={shape === 'floor'} onClick={() => setShape('floor')} icon={<Square className="h-3 w-3" />} label="Floor" />
          </div>
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {(['final', 'diffuse', 'normal', 'roughness'] as const).map(m => (
              <Button key={m} size="sm" variant={viewMode === m ? 'default' : 'outline'} className="h-7 text-xs capitalize" onClick={() => setViewMode(m)}>{m}</Button>
            ))}
          </div>
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 bg-card/80 backdrop-blur rounded-md px-2 py-1 border border-border">
            <Label className="text-xs">Tile</Label>
            <input
              type="range" min={1} max={6} step={1}
              value={tileRepeat}
              onChange={(e) => setTileRepeat(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-mono">{tileRepeat}x</span>
          </div>
          <div className="flex-1 min-h-0">
            {set ? (
              <TexturePreview3D set={set} shape={shape} viewMode={viewMode} tileRepeat={tileRepeat} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          {busy && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* RIGHT — Map outputs */}
        <Card className="rounded-none border-y-0 border-r-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            <h3 className="text-sm font-semibold">Generated maps</h3>
            {set && (
              <>
                <MapThumb label="Diffuse" canvas={set.diffuse} onDownload={() => exportPng(set.diffuse, `${textureName}_diffuse.png`)} />
                <MapThumb label="Normal" canvas={set.normal} onDownload={() => exportPng(set.normal, `${textureName}_normal.png`)} />
                <MapThumb label="Roughness" canvas={set.roughness} onDownload={() => exportPng(set.roughness, `${textureName}_roughness.png`)} />
                <MapThumb label="AO" canvas={set.ao} onDownload={() => exportPng(set.ao, `${textureName}_ao.png`)} />
                <MapThumb label="Height" canvas={set.height} onDownload={() => exportPng(set.height, `${textureName}_height.png`)} />
                <MapThumb label="Packed RGBA (R=rough, G=AO, B=metal)" canvas={set.packed} onDownload={() => exportPng(set.packed, `${textureName}_packed.png`)} />
              </>
            )}
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              Farming Simulator preset: 1024² PNG with safe margins. Convert to DDS (DXT5) using FS Modhub tools before in-game use.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, min = 0, max = 1, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="mt-1" />
    </div>
  );
}

function ShapeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button size="sm" variant={active ? 'default' : 'outline'} className="h-7 text-xs gap-1" onClick={onClick}>
      {icon} {label}
    </Button>
  );
}

function MapThumb({ label, canvas, onDownload }: { label: string; canvas: HTMLCanvasElement; onDownload: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const clone = document.createElement('canvas');
    clone.width = 96; clone.height = 96;
    const ctx = clone.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, 96, 96);
    clone.className = 'rounded border border-border';
    ref.current.appendChild(clone);
  }, [canvas]);
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
      <div ref={ref} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onDownload}>
          <Download className="h-3 w-3 mr-1" /> PNG
        </Button>
      </div>
    </div>
  );
}

export default TexturesPanel;
