import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import QRCode from 'qrcode';

interface SavedQR {
  name: string;
  dataUrl: string;
  content: string;
  createdAt: string;
}

const EDGE_STYLES = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
];

export function QRCodeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [content, setContent] = useState('https://www.cridergpt.com');
  const [name, setName] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [edgeStyle, setEdgeStyle] = useState('square');
  const [logoUrl, setLogoUrl] = useState('');
  const [savedQRs, setSavedQRs] = useState<SavedQR[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cridergpt-qr-gallery');
    if (stored) setSavedQRs(JSON.parse(stored));
  }, []);

  const generateQR = async () => {
    if (!content.trim()) return;
    try {
      const opts: any = {
        width: 512,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: 'H',
      };

      const dataUrl = await QRCode.toDataURL(content, opts);

      // If logo, draw on canvas
      if (logoUrl.trim()) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((res) => { qrImg.onload = () => res(); qrImg.src = dataUrl; });
        ctx.drawImage(qrImg, 0, 0, 512, 512);

        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => { logo.onload = () => res(); logo.onerror = rej; logo.src = logoUrl; });
          const logoSize = 100;
          const x = (512 - logoSize) / 2;
          ctx.fillStyle = bgColor;
          ctx.fillRect(x - 5, x - 5, logoSize + 10, logoSize + 10);
          ctx.drawImage(logo, x, x, logoSize, logoSize);
        } catch { /* logo load failed, skip */ }

        setPreview(canvas.toDataURL('image/png'));
      } else {
        setPreview(dataUrl);
      }
    } catch (err) {
      console.error('QR generation failed', err);
    }
  };

  useEffect(() => { if (content) generateQR(); }, [content, fgColor, bgColor, edgeStyle, logoUrl]);

  const downloadQR = () => {
    if (!preview) return;
    const link = document.createElement('a');
    link.download = `${name || 'qr-code'}.png`;
    link.href = preview;
    link.click();
  };

  const saveQR = () => {
    if (!preview) return;
    const qr: SavedQR = {
      name: name || `QR-${Date.now()}`,
      dataUrl: preview,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = [qr, ...savedQRs];
    setSavedQRs(updated);
    localStorage.setItem('cridergpt-qr-gallery', JSON.stringify(updated));
  };

  const deleteQR = (idx: number) => {
    const updated = savedQRs.filter((_, i) => i !== idx);
    setSavedQRs(updated);
    localStorage.setItem('cridergpt-qr-gallery', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">QR Code Generator</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Controls */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My QR Code" />
            </div>
            <div>
              <Label>Content (URL or text)</Label>
              <Input value={content} onChange={e => setContent(e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Foreground</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer border" />
                  <Input value={fgColor} onChange={e => setFgColor(e.target.value)} className="flex-1 text-xs" />
                </div>
              </div>
              <div>
                <Label>Background</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer border" />
                  <Input value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 text-xs" />
                </div>
              </div>
            </div>
            <div>
              <Label>Edge Style</Label>
              <Select value={edgeStyle} onValueChange={setEdgeStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDGE_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo Overlay (URL)</Label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://logo.png" />
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadQR} disabled={!preview} className="flex-1 gap-1">
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <Button variant="secondary" onClick={saveQR} disabled={!preview} className="flex-1">
                Save to Gallery
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardContent className="p-4 flex items-center justify-center min-h-[300px]">
            {preview ? (
              <img src={preview} alt="QR Code Preview" className="max-w-full max-h-80 rounded-lg shadow-sm" />
            ) : (
              <p className="text-muted-foreground text-sm">Enter content to generate QR code</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gallery */}
      {savedQRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Saved QR Codes <Badge variant="secondary">{savedQRs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {savedQRs.map((qr, i) => (
                <div key={i} className="border rounded-lg p-2 text-center space-y-1 group relative">
                  <img src={qr.dataUrl} alt={qr.name} className="w-full aspect-square rounded" />
                  <p className="text-[10px] font-medium truncate">{qr.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteQR(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
