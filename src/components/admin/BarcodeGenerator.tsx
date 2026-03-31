import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Barcode, Download, Trash2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface SavedBarcode {
  name: string;
  dataUrl: string;
  value: string;
  format: string;
  createdAt: string;
}

const FORMATS = [
  { value: 'CODE128', label: 'Code 128' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'UPC', label: 'UPC-A' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'ITF14', label: 'ITF-14' },
];

export function BarcodeGenerator() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [value, setValue] = useState('123456789012');
  const [name, setName] = useState('');
  const [format, setFormat] = useState('CODE128');
  const [lineColor, setLineColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [showText, setShowText] = useState(true);
  const [savedBarcodes, setSavedBarcodes] = useState<SavedBarcode[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('cridergpt-barcode-gallery');
    if (stored) setSavedBarcodes(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !value.trim()) return;
    try {
      JsBarcode(svgRef.current, value, {
        format,
        lineColor,
        background: bgColor,
        displayValue: showText,
        width: 2,
        height: 80,
        margin: 10,
        fontSize: 14,
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Invalid barcode value');
    }
  }, [value, format, lineColor, bgColor, showText]);

  const getSvgDataUrl = (): string | null => {
    if (!svgRef.current) return null;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    return 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const downloadBarcode = () => {
    if (!svgRef.current) return;
    // Convert SVG to PNG via canvas
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `${name || 'barcode'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const saveBarcode = () => {
    const dataUrl = getSvgDataUrl();
    if (!dataUrl) return;
    const bc: SavedBarcode = {
      name: name || `Barcode-${Date.now()}`,
      dataUrl,
      value,
      format,
      createdAt: new Date().toISOString(),
    };
    const updated = [bc, ...savedBarcodes];
    setSavedBarcodes(updated);
    localStorage.setItem('cridergpt-barcode-gallery', JSON.stringify(updated));
  };

  const deleteBarcode = (idx: number) => {
    const updated = savedBarcodes.filter((_, i) => i !== idx);
    setSavedBarcodes(updated);
    localStorage.setItem('cridergpt-barcode-gallery', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Barcode className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Barcode Generator</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Product barcode" />
            </div>
            <div>
              <Label>Value</Label>
              <Input value={value} onChange={e => setValue(e.target.value)} placeholder="123456789012" />
              {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
            </div>
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Line Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={lineColor} onChange={e => setLineColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer border" />
                  <Input value={lineColor} onChange={e => setLineColor(e.target.value)} className="flex-1 text-xs" />
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
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showText} onChange={e => setShowText(e.target.checked)} id="showText" />
              <Label htmlFor="showText">Show text below barcode</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadBarcode} className="flex-1 gap-1">
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <Button variant="secondary" onClick={saveBarcode} className="flex-1">
                Save to Gallery
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
            <svg ref={svgRef} />
          </CardContent>
        </Card>
      </div>

      {savedBarcodes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Saved Barcodes <Badge variant="secondary">{savedBarcodes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {savedBarcodes.map((bc, i) => (
                <div key={i} className="border rounded-lg p-2 text-center space-y-1 group relative">
                  <img src={bc.dataUrl} alt={bc.name} className="w-full rounded" />
                  <p className="text-[10px] font-medium truncate">{bc.name}</p>
                  <p className="text-[9px] text-muted-foreground">{bc.format}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteBarcode(i)}
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
