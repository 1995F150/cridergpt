import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, Wifi, Smartphone, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TagScannerProps {
  onTagScanned: (tagNumber: string) => Promise<any>;
  onCardScanned?: (cardId: string) => Promise<any>;
}

export function TagScanner({ onTagScanned, onCardScanned }: TagScannerProps) {
  const [manualTag, setManualTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanMode, setScanMode] = useState<'tag' | 'rfid'>('rfid');

  useEffect(() => {
    if ('NDEFReader' in window) setNfcSupported(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== inputRef.current) return;
      if (e.key === 'Enter' && manualTag.trim()) {
        e.preventDefault();
        handleScan(manualTag.trim());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualTag, scanMode]);

  const handleScan = async (tagId: string) => {
    if (!tagId) return;
    setScanning(true);
    setLastScanned(tagId);
    setScanResult(null);
    try {
      if (scanMode === 'rfid' && onCardScanned) {
        const result = await onCardScanned(tagId);
        setScanResult(result);
      } else {
        await onTagScanned(tagId);
      }
    } finally {
      setScanning(false);
      setManualTag('');
    }
  };

  const startNfcScan = async () => {
    if (!nfcSupported) return;
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setScanning(true);
      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        handleScan(serialNumber);
      });
    } catch (err) {
      console.error('NFC scan failed:', err);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scan className="h-5 w-5 text-primary" />
          Scan Tag / RFID Card
          {nfcSupported && (
            <Badge variant="outline" className="text-xs ml-auto flex items-center gap-1">
              <Wifi className="h-3 w-3" /> NFC Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mode selector */}
        <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'tag' | 'rfid')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="rfid" className="text-xs sm:text-sm flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> RFID Card
            </TabsTrigger>
            <TabsTrigger value="tag" className="text-xs sm:text-sm">🏷️ Visual Tag</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          {scanMode === 'rfid'
            ? 'Scan an RFID card or type the card ID. The backend validates authorization and returns the animal profile.'
            : 'Type a visual tag number to look up the animal directly.'}
        </p>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={scanMode === 'rfid' ? 'Card ID (e.g. CARD-001)' : 'Tag number'}
            value={manualTag}
            onChange={e => setManualTag(e.target.value)}
            className="h-12 text-lg font-mono flex-1"
            autoComplete="off"
          />
          <Button
            onClick={() => handleScan(manualTag.trim())}
            disabled={!manualTag.trim() || scanning}
            className="h-12 px-6"
          >
            {scanning ? 'Scanning...' : scanMode === 'rfid' ? 'Scan Card' : 'Look Up'}
          </Button>
        </div>

        {nfcSupported && (
          <Button variant="outline" className="w-full h-12" onClick={startNfcScan} disabled={scanning}>
            <Smartphone className="h-4 w-4 mr-2" />
            Tap NFC Tag with Phone
          </Button>
        )}

        {lastScanned && (
          <p className="text-xs text-muted-foreground text-center">
            Last scanned: <span className="font-mono font-medium">{lastScanned}</span>
          </p>
        )}

        {scanResult?.error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {scanResult.error}
          </div>
        )}

        {scanResult?.card && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium text-primary">✅ Card scanned successfully</p>
            <p className="text-xs text-muted-foreground">Last scan: {new Date(scanResult.card.last_scan).toLocaleString()}</p>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">📡 Hardware Connection Guide:</p>
          <p>• <strong>USB RFID Reader:</strong> Plug in → focus input → scan card → auto-fills</p>
          <p>• <strong>Bluetooth RFID:</strong> Pair via settings → same as USB</p>
          <p>• <strong>Phone NFC:</strong> Tap NFC button → hold card/tag to phone</p>
          <p>• <strong>Manual:</strong> Type the card/tag ID and press Scan</p>
        </div>
      </CardContent>
    </Card>
  );
}
