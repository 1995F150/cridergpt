import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Nfc, Lock, Unlock, Shield, RefreshCw, CheckCircle2,
  AlertTriangle, Loader2, Tag, Database, Zap, History,
  ShieldCheck, Eye, EyeOff, ChevronDown, Settings2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TagPoolEntry {
  id: string;
  tag_id: string;
  status: string;
  assigned_to_animal: string | null;
  created_at: string;
  nfc_written_at: string | null;
  nfc_written_by: string | null;
  nfc_locked: boolean;
}

interface WriteLog {
  id: string;
  tag_id: string;
  action: string;
  status: 'success' | 'error' | 'pending';
  timestamp: Date;
  encrypted: boolean;
  locked: boolean;
}

export function NFCTagWriter() {
  const { user } = useAuth();
  const [tagPool, setTagPool] = useState<TagPoolEntry[]>([]);
  const [allTags, setAllTags] = useState<TagPoolEntry[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [customTagId, setCustomTagId] = useState<string>('');
  const [useCustomId, setUseCustomId] = useState(false);
  const [encryptData, setEncryptData] = useState(false);
  const [lockTag, setLockTag] = useState(false);
  const [writeUrl, setWriteUrl] = useState(true);
  const [writePlainText, setWritePlainText] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [writeLogs, setWriteLogs] = useState<WriteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastReadData, setLastReadData] = useState<string | null>(null);
  const [lastReadMatch, setLastReadMatch] = useState<TagPoolEntry | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    setNfcSupported('NDEFReader' in window);
    fetchTagPool();
  }, []);

  const fetchTagPool = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('livestock_tag_pool')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const all = data || [];
      setAllTags(all);
      setTagPool(all.filter((t: TagPoolEntry) => t.status === 'available'));
    } catch (error) {
      console.error('Error fetching tag pool:', error);
      toast.error('Failed to load tag pool');
    } finally {
      setLoading(false);
    }
  };

  const getTagIdToWrite = (): string => {
    if (useCustomId) return customTagId.trim();
    return selectedTagId;
  };

  const buildPayload = (tagId: string): string => {
    if (!encryptData) return tagId;
    const payload = JSON.stringify({ id: tagId, v: 1, ts: Date.now(), src: 'cridergpt-admin' });
    return `CGPT:${btoa(payload)}`;
  };

  const addLog = (tag_id: string, action: string, status: 'success' | 'error' | 'pending', encrypted: boolean, locked: boolean) => {
    setWriteLogs(prev => [{
      id: crypto.randomUUID(), tag_id, action, status, timestamp: new Date(), encrypted, locked
    }, ...prev].slice(0, 50));
  };

  const markTagProgrammed = async (tagId: string) => {
    try {
      await (supabase as any)
        .from('livestock_tag_pool')
        .update({
          status: 'programmed',
          nfc_written_at: new Date().toISOString(),
          nfc_written_by: user?.id,
          nfc_locked: lockTag,
        })
        .eq('tag_id', tagId);
    } catch (err) {
      console.error('Failed to update tag pool status:', err);
    }
  };

  const writeNFCTag = async () => {
    const tagId = getTagIdToWrite();
    if (!tagId) { toast.error('Select or enter a tag ID first'); return; }
    if (!nfcSupported) { toast.error('NFC is not supported on this device'); return; }

    if (lockTag) {
      const confirmed = window.confirm(
        `⚠️ PERMANENT LOCK WARNING\n\nYou are about to PERMANENTLY lock tag "${tagId}".\n\n• This CANNOT be undone\n• The tag becomes read-only forever\n• Only NTAG213/215/216 chips support locking\n• If locking fails, the tag may still be writable\n\nProceed with permanent lock?`
      );
      if (!confirmed) {
        toast.info('Lock cancelled — tag not written');
        return;
      }
    }

    setIsWriting(true);
    addLog(tagId, 'write', 'pending', encryptData, lockTag);

    try {
      const ndef = new (window as any).NDEFReader();
      const records: any[] = [];
      if (writeUrl) {
        records.push({ recordType: 'url', data: `https://cridergpt.lovable.app/tag/${tagId}` });
      }
      if (writePlainText) {
        records.push({ recordType: 'text', data: buildPayload(tagId) });
      }
      if (records.length === 0) {
        toast.error('Enable at least one record type (URL or plain text)');
        setIsWriting(false);
        return;
      }
      await ndef.write({ records });

      if (lockTag) {
        try {
          await ndef.makeReadOnly();
          toast.success(`Tag written & locked: ${tagId}`);
        } catch (lockErr) {
          console.warn('Tag locking not supported:', lockErr);
          toast.warning(`Tag written but locking failed. ID: ${tagId}`);
        }
      } else {
        toast.success(`Tag written: ${tagId}`);
      }

      await markTagProgrammed(tagId);
      addLog(tagId, 'write', 'success', encryptData, lockTag);
      fetchTagPool();

      if (batchMode && batchQueue.length > 0) {
        const next = batchQueue[0];
        setBatchQueue(prev => prev.slice(1));
        setSelectedTagId(next);
        toast.info(`Next tag queued: ${next}. Tap the next NFC tag.`);
      }
    } catch (error: any) {
      console.error('NFC write error:', error);
      addLog(tagId, 'write', 'error', encryptData, lockTag);
      toast.error(`Write failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsWriting(false);
    }
  };

  const decodeTagContent = (text: string): string => {
    if (text.startsWith('CGPT:')) {
      try {
        const decoded = JSON.parse(atob(text.slice(5)));
        return decoded.id || text;
      } catch { return text; }
    }
    return text;
  };

  const readNFCTag = async () => {
    if (!nfcSupported) { toast.error('NFC is not supported on this device'); return; }
    setIsReading(true);
    setLastReadData(null);
    setLastReadMatch(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener('reading', ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const decoder = new TextDecoder();
            const raw = decoder.decode(record.data);
            const plainId = decodeTagContent(raw);
            setLastReadData(raw);

            const match = allTags.find(t => t.tag_id === plainId);
            setLastReadMatch(match || null);

            addLog(plainId, 'read', 'success', raw.startsWith('CGPT:'), false);
            toast.success('Tag read successfully');
          }
        }
        setIsReading(false);
      });

      ndef.addEventListener('readingerror', () => {
        addLog('unknown', 'read', 'error', false, false);
        toast.error('Failed to read tag');
        setIsReading(false);
      });

      toast.info('Hold your device near the NFC tag...');
    } catch (error: any) {
      console.error('NFC read error:', error);
      toast.error(`Read failed: ${error.message || 'Unknown error'}`);
      setIsReading(false);
    }
  };

  const addToBatchQueue = () => {
    const availableIds = tagPool.filter(t => !batchQueue.includes(t.tag_id)).map(t => t.tag_id);
    if (availableIds.length === 0) { toast.error('No more available tags in pool'); return; }
    setBatchQueue(prev => [...prev, ...availableIds.slice(0, 10)]);
    toast.success(`Added ${Math.min(availableIds.length, 10)} tags to batch queue`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Available</Badge>;
      case 'programmed': return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">Programmed</Badge>;
      case 'assigned': return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">Assigned</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const filteredTags = statusFilter === 'all' ? allTags : allTags.filter(t => t.status === statusFilter);
  const counts = { available: allTags.filter(t => t.status === 'available').length, programmed: allTags.filter(t => t.status === 'programmed').length, assigned: allTags.filter(t => t.status === 'assigned').length };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Nfc className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">NFC Tag Writer</h2>
              <p className="text-muted-foreground text-sm">Writes URL + plain ID by default · iPhone-friendly tap-to-open</p>
            </div>
            <Badge variant={nfcSupported ? 'default' : 'destructive'} className="gap-1.5">
              {nfcSupported ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {nfcSupported ? 'NFC Ready' : 'NFC Not Available'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Write Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-primary" />
              Tag ID Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={useCustomId} onCheckedChange={setUseCustomId} />
              <Label className="text-sm">{useCustomId ? 'Manual ID entry' : 'Pull from Tag Pool'}</Label>
            </div>

            {useCustomId ? (
              <div className="space-y-2">
                <Label htmlFor="custom-tag">Custom Tag ID</Label>
                <Input id="custom-tag" placeholder="CriderGPT-XXXXXX" value={customTagId} onChange={e => setCustomTagId(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select from Pool ({tagPool.length} available)</Label>
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                  <SelectTrigger><SelectValue placeholder={loading ? 'Loading...' : 'Choose a tag ID'} /></SelectTrigger>
                  <SelectContent>
                    {tagPool.map(tag => (
                      <SelectItem key={tag.id} value={tag.tag_id}>{tag.tag_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchTagPool} className="gap-1.5 text-xs">
                  <RefreshCw className="h-3 w-3" /> Refresh Pool
                </Button>
              </div>
            )}

            <Separator />

            {/* Batch Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Batch Mode</Label>
                <p className="text-xs text-muted-foreground">Queue multiple tags for fast sequential writing</p>
              </div>
              <Switch checked={batchMode} onCheckedChange={setBatchMode} />
            </div>

            {batchMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{batchQueue.length} tags in queue</span>
                  <Button variant="outline" size="sm" onClick={addToBatchQueue} className="gap-1.5 text-xs">
                    <Database className="h-3 w-3" /> Load from Pool
                  </Button>
                </div>
                {batchQueue.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {batchQueue.slice(0, 5).map((id, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{id}</Badge>
                    ))}
                    {batchQueue.length > 5 && <Badge variant="secondary" className="text-xs">+{batchQueue.length - 5} more</Badge>}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Record Type Selection (default: both) */}
            <div className="space-y-3 rounded-lg bg-primary/5 border border-primary/15 p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Records to Write</p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">URL Record (iPhone tap-to-open)</Label>
                  <p className="text-xs text-muted-foreground font-mono break-all">https://cridergpt.lovable.app/tag/&#123;id&#125;</p>
                </div>
                <Switch checked={writeUrl} onCheckedChange={setWriteUrl} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Plain-Text Record (Android scan button)</Label>
                  <p className="text-xs text-muted-foreground">Backward-compatible with existing scanner</p>
                </div>
                <Switch checked={writePlainText} onCheckedChange={setWritePlainText} />
              </div>
            </div>

            <Separator />

            {/* Advanced Settings (Lock + Encrypt) */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary transition-colors">
                <Settings2 className="h-4 w-4" />
                Advanced Settings
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Encrypt Payload</Label>
                    <p className="text-xs text-muted-foreground">Encode with CGPT: prefix (not recommended for compatibility)</p>
                  </div>
                  <Switch checked={encryptData} onCheckedChange={setEncryptData} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Lock Tag (Permanent)</Label>
                    <p className="text-xs text-destructive/80">⚠️ Cannot be undone — tag becomes read-only forever</p>
                  </div>
                  <Switch checked={lockTag} onCheckedChange={setLockTag} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={writeNFCTag} disabled={isWriting || !nfcSupported || !getTagIdToWrite()} className="flex-1 gap-2">
                {isWriting ? <Loader2 className="h-4 w-4 animate-spin" /> : lockTag ? <Lock className="h-4 w-4" /> : <Nfc className="h-4 w-4" />}
                {isWriting ? 'Writing...' : lockTag ? 'Write & Lock' : 'Write Tag'}
              </Button>
              <Button variant="outline" onClick={readNFCTag} disabled={isReading || !nfcSupported} className="gap-2">
                {isReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Read
              </Button>
            </div>

            {/* Write Preview */}
            {getTagIdToWrite() && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Write Preview</p>
                <p className="text-sm font-mono">{getTagIdToWrite()}</p>
                <p className="text-xs text-muted-foreground font-mono break-all">Payload: {buildPayload(getTagIdToWrite())}</p>
                <div className="flex gap-2 mt-1">
                  {encryptData && <Badge variant="outline" className="text-xs gap-1"><Shield className="h-3 w-3" /> Encrypted</Badge>}
                  {lockTag && <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Read result + Logs + Tag Pool */}
        <div className="space-y-6">
          {/* Last Read */}
          {lastReadData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-primary" /> Last Read Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Raw data:</p>
                  <p className="text-sm font-mono break-all">{lastReadData}</p>
                  {lastReadData.startsWith('CGPT:') && (
                    <>
                      <p className="text-xs text-muted-foreground mt-2 mb-1">Decoded ID:</p>
                      <p className="text-sm font-mono">{decodeTagContent(lastReadData)}</p>
                    </>
                  )}
                </div>
                {lastReadMatch ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                    <p className="text-sm font-medium text-primary">✅ Pool Match Found</p>
                    <p className="text-xs">Tag ID: <span className="font-mono">{lastReadMatch.tag_id}</span></p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {getStatusBadge(lastReadMatch.status)}
                      {lastReadMatch.nfc_locked && <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">❌ No pool match — this tag ID is not in the system</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Write History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" /> Write History
                <Badge variant="secondary" className="ml-auto text-xs">{writeLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {writeLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No operations yet.</div>
                ) : (
                  <div className="space-y-2">
                    {writeLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                        {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                        {log.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        {log.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">{log.tag_id}</p>
                          <p className="text-xs text-muted-foreground">{log.action} · {log.timestamp.toLocaleTimeString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {log.encrypted && <Shield className="h-3 w-3 text-primary" />}
                          {log.locked && <Lock className="h-3 w-3 text-orange-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tag Pool Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" /> Tag Pool Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>
                  All ({allTags.length})
                </Button>
                <Button variant={statusFilter === 'available' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('available')}>
                  Available ({counts.available})
                </Button>
                <Button variant={statusFilter === 'programmed' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('programmed')}>
                  Programmed ({counts.programmed})
                </Button>
                <Button variant={statusFilter === 'assigned' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('assigned')}>
                  Assigned ({counts.assigned})
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                {filteredTags.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No tags found.</div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredTags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-sm font-mono flex-1 truncate">{tag.tag_id}</span>
                        {getStatusBadge(tag.status)}
                        {tag.nfc_locked && <Lock className="h-3 w-3 text-orange-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
