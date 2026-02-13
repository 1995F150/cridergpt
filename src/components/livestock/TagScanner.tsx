import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, Wifi, WifiOff, Smartphone } from 'lucide-react';

interface TagScannerProps {
  onTagScanned: (tagNumber: string) => Promise<any>;
}

export function TagScanner({ onTagScanned }: TagScannerProps) {
  const [manualTag, setManualTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for Web NFC API support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  // USB/Bluetooth RFID readers typically send data as keyboard input
  // This auto-submits when a rapid sequence of characters is detected
  const [buffer, setBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process when input is focused
      if (document.activeElement !== inputRef.current) return;
      
      const now = Date.now();
      // If Enter key and we have buffer content, it's likely a scanner
      if (e.key === 'Enter' && manualTag.trim()) {
        e.preventDefault();
        handleScan(manualTag.trim());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualTag]);

  const handleScan = async (tagId: string) => {
    if (!tagId) return;
    setScanning(true);
    setLastScanned(tagId);
    try {
      await onTagScanned(tagId);
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
          Scan Tag / Look Up Animal
          {nfcSupported && (
            <Badge variant="outline" className="text-xs ml-auto flex items-center gap-1">
              <Wifi className="h-3 w-3" /> NFC Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Type a tag number, scan with your phone's NFC, or plug in a USB/Bluetooth RFID reader and scan.
        </p>
        
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Tag number (type or scan)"
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
            {scanning ? 'Looking up...' : 'Look Up'}
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

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">📡 Hardware Connection Guide:</p>
          <p>• <strong>USB RFID Reader:</strong> Plug in → focus the input field → scan tag → it auto-fills</p>
          <p>• <strong>Bluetooth RFID:</strong> Pair via phone settings → same as USB</p>
          <p>• <strong>Phone NFC:</strong> Tap the NFC button above → hold tag to phone back</p>
          <p>• <strong>Visual Tags:</strong> Just type the number and press Look Up</p>
        </div>
      </CardContent>
    </Card>
  );
}
