import { useRef, useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

// iOS AppIcon set (iPhone + iPad + App Store + Settings + Spotlight + Notifications)
const IOS_ICONS = [
  { idiom: "iphone",        size: 20,  scale: 2 }, { idiom: "iphone", size: 20,  scale: 3 },
  { idiom: "iphone",        size: 29,  scale: 2 }, { idiom: "iphone", size: 29,  scale: 3 },
  { idiom: "iphone",        size: 40,  scale: 2 }, { idiom: "iphone", size: 40,  scale: 3 },
  { idiom: "iphone",        size: 60,  scale: 2 }, { idiom: "iphone", size: 60,  scale: 3 },
  { idiom: "ipad",          size: 20,  scale: 1 }, { idiom: "ipad",   size: 20,  scale: 2 },
  { idiom: "ipad",          size: 29,  scale: 1 }, { idiom: "ipad",   size: 29,  scale: 2 },
  { idiom: "ipad",          size: 40,  scale: 1 }, { idiom: "ipad",   size: 40,  scale: 2 },
  { idiom: "ipad",          size: 76,  scale: 2 }, { idiom: "ipad",   size: 83.5, scale: 2 },
  { idiom: "ios-marketing", size: 1024, scale: 1 },
];

const ANDROID_ICONS: { folder: string; size: number }[] = [
  { folder: "mipmap-mdpi",    size: 48  },
  { folder: "mipmap-hdpi",    size: 72  },
  { folder: "mipmap-xhdpi",   size: 96  },
  { folder: "mipmap-xxhdpi",  size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
  { folder: "play-store",     size: 512 },
];

export default function IOSAssetStudio() {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });

  const resize = async (img: HTMLImageElement, px: number): Promise<Blob> => {
    const c = document.createElement("canvas");
    c.width = px; c.height = px;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, px, px);
    return new Promise(r => c.toBlob(b => r(b!), "image/png"));
  };

  const onFile = (f: File) => {
    if (!f.type.startsWith("image/")) { toast.error("Pick a PNG/JPG image"); return; }
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!src) return;
    setBusy(true);
    try {
      const img = await loadImage(src);
      if (img.width < 1024 || img.height < 1024) toast.warning("Source < 1024px — quality may suffer");

      const zip = new JSZip();
      const ios = zip.folder("ios/AppIcon.appiconset")!;
      const images: any[] = [];
      for (const i of IOS_ICONS) {
        const px = Math.round(i.size * i.scale);
        const name = `icon-${i.idiom}-${i.size}@${i.scale}x.png`;
        ios.file(name, await resize(img, px));
        images.push({ idiom: i.idiom, size: `${i.size}x${i.size}`, scale: `${i.scale}x`, filename: name });
      }
      ios.file("Contents.json", JSON.stringify({ images, info: { version: 1, author: "cridergpt-devhub" } }, null, 2));

      const android = zip.folder("android/res")!;
      for (const a of ANDROID_ICONS) {
        if (a.folder === "play-store") {
          android.file("play-store-icon-512.png", await resize(img, a.size));
        } else {
          android.folder(a.folder)!.file("ic_launcher.png", await resize(img, a.size));
          android.folder(a.folder)!.file("ic_launcher_round.png", await resize(img, a.size));
        }
      }

      // App Store screenshot template (6.7" iPhone) — black bg with centered icon
      const ssCanvas = document.createElement("canvas");
      ssCanvas.width = 1290; ssCanvas.height = 2796;
      const sctx = ssCanvas.getContext("2d")!;
      sctx.fillStyle = "#0a0a0f"; sctx.fillRect(0, 0, 1290, 2796);
      sctx.drawImage(img, 395, 1148, 500, 500);
      const ssBlob: Blob = await new Promise(r => ssCanvas.toBlob(b => r(b!), "image/png"));
      zip.folder("screenshots")!.file("iphone-67-template-1.png", ssBlob);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "app-icons-bundle.zip"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Bundle downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <DevHubPage title="iOS Asset Studio" subtitle="One image → every iOS + Android icon size">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4" />Source image</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />Pick image (1024×1024 recommended)
            </Button>
            {src && (
              <div className="border border-border rounded-md p-4 bg-card flex items-center justify-center">
                <img src={src} alt="source" className="max-h-64 rounded" />
              </div>
            )}
            <Button onClick={generate} disabled={!src || busy} className="w-full">
              <Download className="w-4 h-4 mr-2" />{busy ? "Resizing…" : "Generate bundle"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">What you get</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Badge>iOS</Badge> <span className="text-muted-foreground ml-2">{IOS_ICONS.length} PNGs + Contents.json (drop into Xcode AppIcon.appiconset)</span>
            </div>
            <div>
              <Badge>Android</Badge> <span className="text-muted-foreground ml-2">5 mipmap densities + Play Store 512</span>
            </div>
            <div>
              <Badge>App Store</Badge> <span className="text-muted-foreground ml-2">1× 6.7" iPhone screenshot template (1290×2796)</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Everything runs in your browser — image never leaves your device.
            </p>
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
