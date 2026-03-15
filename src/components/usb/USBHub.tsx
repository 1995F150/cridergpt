
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  FolderOpen, Upload, Usb, ScanLine, FileSpreadsheet,
  AlertTriangle, CheckCircle2, Loader2, Trash2, RefreshCw,
  HardDrive, Activity, Wifi, WifiOff, File, X, Contact2,
  Cable, Smartphone, Share, Plus, Download, Info, Code2, Wrench
} from 'lucide-react';

// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isAndroid = /Android/.test(navigator.userAgent);

// Browser compatibility checks (with iOS awareness)
const hasFileSystemAccess = 'showDirectoryPicker' in window;
const hasWebUSB = 'usb' in navigator;
const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;
const hasWebSerial = 'serial' in navigator;

interface USBLog {
  id: string;
  source_type: string;
  device_name: string | null;
  file_name: string | null;
  data_payload: any;
  file_url: string | null;
  records_imported: number;
  status: string;
  created_at: string;
}

export function USBHub() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<USBLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { isInstallable, isIOS: pwaIsIOS } = usePWAInstall();

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('usb_data_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const logAction = async (entry: Partial<USBLog>) => {
    if (!user) return;
    await (supabase as any).from('usb_data_logs').insert({
      user_id: user.id,
      ...entry,
    });
    fetchLogs();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Usb className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">USB Data Hub</h1>
          <p className="text-sm text-muted-foreground">Connect devices, import files, and scan tags</p>
        </div>
      </div>

      {/* PWA Install Prompt */}
      {(isInstallable || pwaIsIOS) && (
        <PWAInstallPrompt variant="card" />
      )}

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="files"><FolderOpen className="h-4 w-4 mr-1.5 hidden sm:inline" />Files</TabsTrigger>
          <TabsTrigger value="device"><Usb className="h-4 w-4 mr-1.5 hidden sm:inline" />Device</TabsTrigger>
          <TabsTrigger value="scanner"><ScanLine className="h-4 w-4 mr-1.5 hidden sm:inline" />Scanner</TabsTrigger>
          <TabsTrigger value="import"><FileSpreadsheet className="h-4 w-4 mr-1.5 hidden sm:inline" />Import</TabsTrigger>
          <TabsTrigger value="contacts"><Contact2 className="h-4 w-4 mr-1.5 hidden sm:inline" />Contacts</TabsTrigger>
          <TabsTrigger value="connected"><Cable className="h-4 w-4 mr-1.5 hidden sm:inline" />Connected</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <FileReaderTab logAction={logAction} loading={loading} setLoading={setLoading} />
        </TabsContent>
        <TabsContent value="device">
          <DeviceConnectTab logAction={logAction} />
        </TabsContent>
        <TabsContent value="scanner">
          <TagScannerTab logAction={logAction} />
        </TabsContent>
        <TabsContent value="import">
          <DataImportTab logAction={logAction} loading={loading} setLoading={setLoading} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsSyncTab logAction={logAction} loading={loading} setLoading={setLoading} />
        </TabsContent>
        <TabsContent value="connected">
          <ConnectedDeviceTab logAction={logAction} loading={loading} setLoading={setLoading} />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent USB Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.source_type}</Badge>
                      <span className="text-muted-foreground">{log.file_name || log.device_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── FILE READER TAB (with iOS fallback) ─────────────────────────
function FileReaderTab({ logAction, loading, setLoading }: { logAction: Function; loading: boolean; setLoading: Function }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ name: string; size: number; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowse = async () => {
    if (isIOS || !hasFileSystemAccess) {
      // Fallback: use standard file input
      fileInputRef.current?.click();
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const found: { name: string; size: number; file: File }[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          found.push({ name: file.name, size: file.size, file });
        }
      }
      setFiles(found);
      toast({ title: 'Directory Opened', description: `Found ${found.length} files` });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    }
  };

  const handleFallbackFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const found: { name: string; size: number; file: File }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      found.push({ name: fileList[i].name, size: fileList[i].size, file: fileList[i] });
    }
    setFiles(found);
    toast({ title: 'Files Selected', description: `${found.length} files ready` });
  };

  const handleUpload = async (item: { name: string; file: File }) => {
    if (!user) return;
    setLoading(true);
    try {
      const path = `${user.id}/${Date.now()}-${item.name}`;
      const { error } = await supabase.storage.from('usb-uploads').upload(path, item.file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('usb-uploads').getPublicUrl(path);
      await logAction({ source_type: 'drive_file', file_name: item.name, file_url: urlData.publicUrl, status: 'completed' });
      toast({ title: 'Uploaded', description: item.name });
      setFiles(prev => prev.filter(f => f.name !== item.name));
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> USB Drive File Reader</CardTitle>
        <CardDescription>Browse files on a connected USB drive and upload them to your cloud storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIOS && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>iOS Mode</AlertTitle>
            <AlertDescription>Using standard file picker. Connect your USB drive via Lightning/USB-C adapter, then select files.</AlertDescription>
          </Alert>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFallbackFiles}
        />
        <Button onClick={handleBrowse} disabled={loading}>
          <FolderOpen className="h-4 w-4 mr-2" /> {isIOS ? 'Select Files' : 'Browse USB Drive'}
        </Button>
        {files.length > 0 && (
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-1">
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleUpload(f)} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DEVICE CONNECT TAB (with iOS fallback) ──────────────────────
function DeviceConnectTab({ logAction }: { logAction: Function }) {
  const [device, setDevice] = useState<any>(null);
  const [readings, setReadings] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const connectDevice = async () => {
    if (!hasWebUSB) {
      toast({ title: 'Not Supported', description: 'WebUSB requires Chrome, Edge, or Brave.', variant: 'destructive' });
      return;
    }
    try {
      const dev = await (navigator as any).usb.requestDevice({ filters: [] });
      await dev.open();
      if (dev.configuration === null) await dev.selectConfiguration(1);
      await dev.claimInterface(0);
      setDevice(dev);
      setConnected(true);
      await logAction({ source_type: 'sensor', device_name: dev.productName || 'USB Device', status: 'completed', data_payload: { vendor: dev.vendorId, product: dev.productId } });
      toast({ title: 'Connected', description: dev.productName || 'USB Device' });
      pollDevice(dev);
    } catch (e: any) {
      if (e.name !== 'NotFoundError') {
        toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' });
      }
    }
  };

  const pollDevice = async (dev: any) => {
    try {
      while (dev.opened) {
        const result = await dev.transferIn(1, 64);
        if (result.data) {
          const text = new TextDecoder().decode(result.data);
          setReadings(prev => [text, ...prev].slice(0, 50));
        }
      }
    } catch {
      setConnected(false);
    }
  };

  const disconnect = async () => {
    if (device) {
      try { await device.close(); } catch {}
      setDevice(null);
      setConnected(false);
      setReadings([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Usb className="h-5 w-5" /> USB Device Connect</CardTitle>
        <CardDescription>Pair with USB hardware (sensors, scales) and stream live data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isIOS || !hasWebUSB) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{isIOS ? 'iOS Device Detected' : 'Browser Not Supported'}</AlertTitle>
            <AlertDescription>
              {isIOS
                ? 'Direct USB pairing isn\'t available on iOS. Use the Files tab to transfer data via Lightning/USB-C adapter, or the Connected tab for file-based data transfer.'
                : 'WebUSB API requires Chrome, Edge, or Brave. Use the Files or Connected tab for file-based data transfer instead.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button onClick={connectDevice} disabled={connected || !hasWebUSB || isIOS}>
            {connected ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
            {connected ? 'Connected' : 'Pair Device'}
          </Button>
          {connected && (
            <Button variant="destructive" onClick={disconnect}><X className="h-4 w-4 mr-2" /> Disconnect</Button>
          )}
        </div>
        {device && (
          <div className="text-sm text-muted-foreground">
            Device: <span className="font-medium text-foreground">{device.productName || 'Unknown'}</span> (VID: {device.vendorId})
          </div>
        )}
        {readings.length > 0 && (
          <ScrollArea className="h-48 border rounded-md bg-muted/30 p-3 font-mono text-xs">
            {readings.map((r, i) => <div key={i} className="text-foreground">{r}</div>)}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── TAG SCANNER TAB ─────────────────────────────────────────────
function TagScannerTab({ logAction }: { logAction: Function }) {
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [animalResult, setAnimalResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startListening = () => {
    setListening(true);
    setScanBuffer('');
    setLastScan(null);
    setAnimalResult(null);
  };

  const stopListening = () => {
    setListening(false);
  };

  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const tag = bufferRef.current.trim();
        if (tag.length > 2) {
          handleScan(tag);
        }
        bufferRef.current = '';
        setScanBuffer('');
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        setScanBuffer(bufferRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { bufferRef.current = ''; setScanBuffer(''); }, 500);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [listening]);

  const handleScan = async (tag: string) => {
    setLastScan(tag);
    setScanning(true);
    try {
      const { data } = await supabase
        .from('livestock_animals')
        .select('*')
        .eq('tag_id', tag)
        .maybeSingle();

      if (data) {
        setAnimalResult(data);
        await logAction({ source_type: 'tag_scanner', device_name: 'HID Scanner', data_payload: { tag_id: tag, animal_id: data.id }, status: 'completed' });
        toast({ title: 'Animal Found', description: `${data.name || data.animal_id} — ${data.species}` });
      } else {
        setAnimalResult(null);
        await logAction({ source_type: 'tag_scanner', device_name: 'HID Scanner', data_payload: { tag_id: tag }, status: 'not_found' });
        toast({ title: 'No Match', description: `No animal found for tag: ${tag}`, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Scan Error', description: e.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleManualScan = () => {
    const input = document.getElementById('manual-tag-input') as HTMLInputElement;
    if (input?.value) handleScan(input.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> Livestock Tag Scanner</CardTitle>
        <CardDescription>Scan RFID/NFC tags from USB scanners to look up animal profiles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={listening ? stopListening : startListening} variant={listening ? 'destructive' : 'default'}>
            {listening ? <><WifiOff className="h-4 w-4 mr-2" /> Stop Listening</> : <><ScanLine className="h-4 w-4 mr-2" /> Start Listening</>}
          </Button>
        </div>
        {listening && (
          <Alert><AlertDescription>
            <span className="animate-pulse">●</span> Listening for scanner input... Scan a tag now.
            {scanBuffer && <span className="ml-2 font-mono text-xs bg-muted px-2 py-0.5 rounded">{scanBuffer}</span>}
          </AlertDescription></Alert>
        )}
        <div className="flex gap-2">
          <Input id="manual-tag-input" placeholder="Or enter tag ID manually (e.g. CriderGPT-A7X9K2)" />
          <Button variant="outline" onClick={handleManualScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
          </Button>
        </div>
        {lastScan && <p className="text-sm text-muted-foreground">Last scanned: <code className="bg-muted px-1.5 py-0.5 rounded">{lastScan}</code></p>}
        {animalResult && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{animalResult.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Animal ID</span><span className="font-medium">{animalResult.animal_id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tag</span><Badge variant="outline">{animalResult.tag_id}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Species</span><span>{animalResult.species}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Breed</span><span>{animalResult.breed || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{animalResult.status}</Badge></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DATA IMPORT TAB ─────────────────────────────────────────────
function DataImportTab({ logAction, loading, setLoading }: { logAction: Function; loading: boolean; setLoading: Function }) {
  const { user } = useAuth();
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [targetTable, setTargetTable] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          const rows = Array.isArray(json) ? json : [json];
          setParsedData(rows.slice(0, 100));
          setColumns(Object.keys(rows[0] || {}));
        } catch { toast({ title: 'Parse Error', description: 'Invalid JSON file', variant: 'destructive' }); }
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        setColumns(headers);
        const rows = lines.slice(1, 101).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
        });
        setParsedData(rows);
      } else {
        toast({ title: 'Unsupported', description: 'Please use CSV or JSON files', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || !targetTable || parsedData.length === 0) {
      toast({ title: 'Missing Info', description: 'Select a target table and load data first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).from(targetTable).insert(
        parsedData.map(row => ({ ...row, user_id: user.id }))
      );
      if (error) throw error;
      await logAction({
        source_type: 'data_import',
        file_name: fileName,
        records_imported: parsedData.length,
        data_payload: { target_table: targetTable, columns },
        status: 'completed',
      });
      toast({ title: 'Import Complete', description: `${parsedData.length} records imported to ${targetTable}` });
      setParsedData([]);
      setColumns([]);
      setFileName('');
    } catch (e: any) {
      toast({ title: 'Import Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Bulk Data Import</CardTitle>
        <CardDescription>Import CSV or JSON files into your database tables</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input type="file" accept=".csv,.json" onChange={handleFileSelect} />
          {fileName && <Badge variant="outline">{fileName}</Badge>}
        </div>
        {columns.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Target table:</span>
              <Select value={targetTable} onValueChange={setTargetTable}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select table..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="livestock_animals">Livestock Animals</SelectItem>
                  <SelectItem value="events">Calendar Events</SelectItem>
                  <SelectItem value="ai_memory">AI Memory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{parsedData.length} rows · {columns.length} columns</p>
            <ScrollArea className="h-48 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>{columns.slice(0, 6).map(c => <TableHead key={c} className="text-xs">{c}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {columns.slice(0, 6).map(c => <TableCell key={c} className="text-xs py-1">{String(row[c] ?? '')}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <Button onClick={handleImport} disabled={loading || !targetTable}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import {parsedData.length} Records
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CONTACTS SYNC TAB (with iOS vCard fallback) ─────────────────
function ContactsSyncTab({ logAction, loading, setLoading }: { logAction: Function; loading: boolean; setLoading: Function }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<{ name: string; phone: string; email: string }[]>([]);
  const [synced, setSynced] = useState(false);
  const vcfInputRef = useRef<HTMLInputElement>(null);

  const pickContacts = async () => {
    if (!hasContactPicker) {
      // On iOS or unsupported, trigger vCard import
      vcfInputRef.current?.click();
      return;
    }
    try {
      const results = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true });
      const parsed = results.map((c: any) => ({
        name: c.name?.[0] || '',
        phone: c.tel?.[0] || '',
        email: c.email?.[0] || '',
      })).filter((c: any) => c.phone || c.email);
      setContacts(parsed);
      setSynced(false);
      toast({ title: 'Contacts Selected', description: `${parsed.length} contacts ready to sync` });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    }
  };

  const parseVCard = (text: string): { name: string; phone: string; email: string }[] => {
    const cards: { name: string; phone: string; email: string }[] = [];
    const entries = text.split('BEGIN:VCARD');
    for (const entry of entries) {
      if (!entry.trim()) continue;
      let name = '';
      let phone = '';
      let email = '';
      const lines = entry.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('FN:') || trimmed.startsWith('FN;')) {
          name = trimmed.split(':').slice(1).join(':').trim();
        } else if (trimmed.startsWith('TEL') && trimmed.includes(':')) {
          phone = phone || trimmed.split(':').slice(1).join(':').trim();
        } else if (trimmed.startsWith('EMAIL') && trimmed.includes(':')) {
          email = email || trimmed.split(':').slice(1).join(':').trim();
        }
      }
      if (name || phone || email) {
        cards.push({ name, phone, email });
      }
    }
    return cards;
  };

  const handleVCFImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseVCard(text).filter(c => c.phone || c.email);
      setContacts(parsed);
      setSynced(false);
      toast({ title: 'vCard Imported', description: `${parsed.length} contacts parsed from ${file.name}` });
    };
    reader.readAsText(file);
  };

  const syncContacts = async () => {
    if (!user || contacts.length === 0) return;
    setLoading(true);
    try {
      const rows = contacts.map(c => ({
        user_id: user.id,
        name: c.name || null,
        phone: c.phone || null,
        email: c.email || null,
        source: isIOS ? 'vcard_import' : 'phone_contacts',
      }));

      const { error } = await (supabase as any).from('user_contacts').upsert(rows, { onConflict: 'user_id,phone' });
      if (error) throw error;

      await logAction({
        source_type: 'contacts',
        records_imported: contacts.length,
        data_payload: { count: contacts.length, method: isIOS ? 'vcard' : 'contact_picker' },
        status: 'completed',
      });
      setSynced(true);
      toast({ title: 'Contacts Synced', description: `${contacts.length} contacts saved to backend` });
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Contact2 className="h-5 w-5" /> Phone Contacts Sync</CardTitle>
        <CardDescription>Import contacts from your phone and sync them to the backend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIOS && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>iOS Mode</AlertTitle>
            <AlertDescription>
              Export your contacts as a .vcf file from the Contacts app (select contacts → Share → vCard), then import below.
            </AlertDescription>
          </Alert>
        )}
        <input
          ref={vcfInputRef}
          type="file"
          accept=".vcf,.vcard"
          className="hidden"
          onChange={handleVCFImport}
        />
        <div className="flex gap-2 flex-wrap">
          <Button onClick={pickContacts} disabled={loading}>
            <Contact2 className="h-4 w-4 mr-2" />
            {hasContactPicker ? 'Select Contacts' : 'Import vCard (.vcf)'}
          </Button>
          {contacts.length > 0 && (
            <Button onClick={syncContacts} disabled={loading || synced} variant={synced ? 'outline' : 'default'}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : synced ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {synced ? 'Synced' : `Sync ${contacts.length} Contacts`}
            </Button>
          )}
        </div>
        {contacts.length > 0 && (
          <ScrollArea className="h-64 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.slice(0, 50).map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1">{c.name || '—'}</TableCell>
                    <TableCell className="text-xs py-1">{c.phone || '—'}</TableCell>
                    <TableCell className="text-xs py-1">{c.email || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CONNECTED DEVICE TAB (Web Serial + fallback) ────────────────
function ConnectedDeviceTab({ logAction, loading, setLoading }: { logAction: Function; loading: boolean; setLoading: Function }) {
  const { user } = useAuth();
  const [port, setPort] = useState<any>(null);
  const [serialData, setSerialData] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [transferredFiles, setTransferredFiles] = useState<{ name: string; size: number; file: File }[]>([]);
  const readerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectSerial = async () => {
    if (!hasWebSerial) {
      toast({ title: 'Not Supported', description: 'Web Serial API requires Chrome or Edge on desktop.', variant: 'destructive' });
      return;
    }
    try {
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });
      setPort(selectedPort);
      setConnected(true);
      toast({ title: 'Serial Connected', description: 'Reading data from connected device...' });
      await logAction({ source_type: 'connected_device', device_name: 'Serial Device', status: 'completed' });
      readSerial(selectedPort);
    } catch (e: any) {
      if (e.name !== 'NotFoundError') {
        toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' });
      }
    }
  };

  const readSerial = async (serialPort: any) => {
    try {
      const reader = serialPort.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        setSerialData(prev => [text, ...prev].slice(0, 100));
      }
    } catch {
      setConnected(false);
    }
  };

  const disconnectSerial = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (port) {
        await port.close();
      }
    } catch {}
    setPort(null);
    setConnected(false);
    setSerialData([]);
  };

  const handleFileTransfer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const found: { name: string; size: number; file: File }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      found.push({ name: fileList[i].name, size: fileList[i].size, file: fileList[i] });
    }
    setTransferredFiles(found);
    toast({ title: 'Files Selected', description: `${found.length} files from connected device` });
  };

  const uploadFile = async (item: { name: string; file: File }) => {
    if (!user) return;
    setLoading(true);
    try {
      const path = `${user.id}/connected-device/${Date.now()}-${item.name}`;
      const { error } = await supabase.storage.from('usb-uploads').upload(path, item.file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('usb-uploads').getPublicUrl(path);
      await logAction({ source_type: 'connected_device', file_name: item.name, file_url: urlData.publicUrl, status: 'completed' });
      toast({ title: 'Uploaded', description: item.name });
      setTransferredFiles(prev => prev.filter(f => f.name !== item.name));
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cable className="h-5 w-5" /> Connected Device Reader</CardTitle>
        <CardDescription>Read data from a plugged-in phone or laptop via USB cable</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIOS && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>iOS Mode</AlertTitle>
            <AlertDescription>
              Connect your device via Lightning/USB-C and select files to transfer. Serial connections are not available on iOS.
            </AlertDescription>
          </Alert>
        )}

        {/* Serial connection (Chrome/Edge desktop) */}
        {hasWebSerial && !isIOS && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Serial Data Stream</h3>
            <div className="flex gap-2">
              <Button onClick={connected ? disconnectSerial : connectSerial} variant={connected ? 'destructive' : 'default'}>
                {connected ? <><WifiOff className="h-4 w-4 mr-2" /> Disconnect</> : <><Cable className="h-4 w-4 mr-2" /> Connect Serial</>}
              </Button>
            </div>
            {serialData.length > 0 && (
              <ScrollArea className="h-40 border rounded-md bg-muted/30 p-3 font-mono text-xs">
                {serialData.map((d, i) => <div key={i} className="text-foreground">{d}</div>)}
              </ScrollArea>
            )}
          </div>
        )}

        {/* File-based transfer (works everywhere) */}
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">File Transfer from Device</h3>
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? 'Select files from your connected device using the Files app.'
              : 'Select files from a connected phone or laptop to upload to CriderGPT.'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileTransfer}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <FolderOpen className="h-4 w-4 mr-2" /> Select Device Files
          </Button>
          {transferredFiles.length > 0 && (
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2 space-y-1">
                {transferredFiles.map((f) => (
                  <div key={f.name} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => uploadFile(f)} disabled={loading}>
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
