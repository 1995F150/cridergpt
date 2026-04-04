import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, Wifi, Smartphone, PlusCircle, Apple, AlertTriangle } from 'lucide-react';

interface TagScannerProps {
  onTagScanned: (tagId: string) => Promise<any>;
  onRegisterAnimal?: (tagId: string) => void;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function TagScanner({ onTagScanned, onRegisterAnimal }: TagScannerProps) {
  const [manualTag, setManualTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('NDEFReader' in window) setNfcSupported(true);
    setIsAppleDevice(isIOS());
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
  }, [manualTag]);

  const handleScan = async (tagId: string) => {
    if (!tagId) return;
    setScanning(true);
    setLastScanned(tagId);
    setScanResult(null);
    try {
      const result = await onTagScanned(tagId);
      setScanResult(result);
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
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        let tagId = '';
        if (message?.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              let raw = decoder.decode(record.data).trim();
              if (raw.startsWith('CGPT:')) {
                try {
                  const decoded = JSON.parse(atob(raw.slice(5)));
                  raw = decoded.id || raw;
                } catch {}
              }
              tagId = raw;
              break;
            } else if (record.recordType === 'url' || record.recordType === 'unknown') {
              try {
                const decoder = new TextDecoder('utf-8');
                const decoded = decoder.decode(record.data).trim();
                if (decoded.startsWith('CriderGPT-') || decoded.length > 3) {
                  tagId = decoded;
                  break;
                }
              } catch {}
            }
          }
        }
        if (!tagId) {
          tagId = serialNumber || '';
        }
        if (tagId) {
          handleScan(tagId);
        }
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
          Scan CriderGPT Tag
          {nfcSupported && (
            <Badge variant="outline" className="text-xs ml-auto flex items-center gap-1">
              <Wifi className="h-3 w-3" /> NFC Ready
            </Badge>
          )}
          {isAppleDevice && !nfcSupported && (
            <Badge variant="outline" className="text-xs ml-auto flex items-center gap-1 border-amber-500/50 text-amber-600">
              <Apple className="h-3 w-3" /> iPhone
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Scan an NFC tag, key fob, or type a CriderGPT Tag ID to pull up the animal profile.
        </p>

        {/* Always-visible manual scan input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Tag ID (e.g. CriderGPT-A7X9K2)"
            value={manualTag}
            onChange={e => setManualTag(e.target.value)}
            className="h-14 text-lg font-mono flex-1"
            autoComplete="off"
          />
          <Button
            onClick={() => handleScan(manualTag.trim())}
            disabled={!manualTag.trim() || scanning}
            className="h-14 px-6 text-base"
          >
            {scanning ? 'Scanning...' : '📡 Scan'}
          </Button>
        </div>

        {/* NFC tap button for Android/Chrome */}
        {nfcSupported && (
          <Button variant="outline" className="w-full h-14 text-base" onClick={startNfcScan} disabled={scanning}>
            <Smartphone className="h-5 w-5 mr-2" />
            Tap NFC Tag with Phone
          </Button>
        )}

        {/* iPhone-specific guidance */}
        {isAppleDevice && !nfcSupported && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4" />
              iPhone NFC Scanning
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>iPhones don't support browser NFC scanning. Use one of these methods instead:</p>
              <p>• <strong>Type the Tag ID</strong> — Enter the CriderGPT tag ID printed on the tag above and tap Scan</p>
              <p>• <strong>USB RFID Reader</strong> — Plug a USB/Lightning RFID reader into your iPhone, the scanned ID will auto-fill</p>
              <p>• <strong>NFC Tools App</strong> — Use the free "NFC Tools" app from the App Store to read the tag, then copy the ID here</p>
              <p>• <strong>Use an Android phone</strong> — Android Chrome supports direct NFC scanning from the browser</p>
            </div>
          </div>
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

        {(scanResult?.status === 'unregistered' || scanResult?.status === 'programmed') && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-primary">
              📡 Tag recognized: <span className="font-mono">{scanResult.tag_id}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {scanResult.status === 'programmed'
                ? 'This tag is programmed and ready to be assigned to an animal.'
                : 'This tag is available and ready to be assigned to a new animal.'}
            </p>
            {onRegisterAnimal && (
              <Button
                className="w-full h-11"
                onClick={() => onRegisterAnimal(scanResult.tag_id)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Register Animal with This Tag
              </Button>
            )}
          </div>
        )}

        {scanResult?.animal && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium text-primary">✅ Animal found — {scanResult.animal.name || scanResult.animal.animal_id}</p>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">📡 How to Scan:</p>
          <p>• <strong>USB RFID Reader:</strong> Plug in → focus input → scan tag → auto-fills</p>
          <p>• <strong>Bluetooth RFID:</strong> Pair via settings → same as USB</p>
          {!isAppleDevice && <p>• <strong>Phone NFC:</strong> Tap NFC button → hold tag/fob to phone</p>}
          <p>• <strong>Manual:</strong> Type the CriderGPT Tag ID and press Scan</p>
        </div>
      </CardContent>
    </Card>
  );
}
