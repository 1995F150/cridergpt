import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Phone, Mail, ShieldCheck, AlertTriangle, Loader2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CRIDER_ID_RE = /CriderGPT-([A-Za-z0-9]{4,})/i;

function normalize(raw: string): string {
  if (!raw) return '';
  let v = raw.trim();
  try { v = decodeURIComponent(v); } catch { /* noop */ }
  v = v.trim().replace(/^[{<\[]+|[}>\]]+$/g, '').trim();
  if (v.startsWith('CGPT:')) {
    try {
      const decoded = JSON.parse(atob(v.slice(5)));
      if (decoded && typeof decoded.id === 'string') v = decoded.id.trim();
    } catch { /* noop */ }
  }
  const m = v.match(CRIDER_ID_RE);
  if (m) return `CriderGPT-${m[1].toUpperCase()}`;
  return v;
}

type LookupResponse = {
  authorized?: boolean;
  registered?: boolean;
  public_profile_enabled?: boolean | null;
  animal?: any;
  owner_contact?: { name?: string; phone?: string; email?: string; preferred_method?: string } | null;
  lost?: { status?: string; instructions?: string | null; last_seen_general_area?: string | null } | null;
  public_health?: Array<{
    id: string;
    category: string;
    public_title: string;
    public_summary?: string;
    event_date?: string;
    next_due_date?: string;
    is_active?: boolean;
  }>;
  error?: string;
  status?: string;
  tag_id?: string;
};

/**
 * Public "Lost animal" / stranger lookup. Always shows the public-safe view,
 * even for signed-in owners — this is the "what does a stranger see" tool.
 */
export function PublicTagLookup() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastTag, setLastTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('NDEFReader' in window) setNfcSupported(true);
  }, []);

  const runLookup = async (raw: string) => {
    const tagId = normalize(raw);
    if (!tagId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLastTag(tagId);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('tag-lookup', {
        body: { tag_id: tagId },
      });
      if (fnErr) throw new Error(fnErr.message || 'Lookup failed');
      setResult(data as LookupResponse);
      if ((data as any)?.error && !(data as any)?.registered) {
        setError((data as any).error);
      }
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const startNfc = async () => {
    if (!nfcSupported) return;
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        let raw = '';
        if (message?.records) {
          for (const record of message.records) {
            try {
              const decoder = new TextDecoder((record as any).encoding || 'utf-8');
              const decoded = decoder.decode(record.data).trim();
              if (decoded) { raw = decoded; break; }
            } catch { /* noop */ }
          }
        }
        if (!raw) raw = serialNumber || '';
        if (raw) runLookup(raw);
      });
    } catch {
      setError('NFC scan failed');
    }
  };

  const animal = result?.animal;
  const isLost = result?.lost && result.lost.status && result.lost.status !== 'safe';

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-5 w-5 text-primary" /> Public Tag Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Found a wandering animal? Scan or enter its CriderGPT tag to reach the owner.
            You'll see the same public info anyone else sees — private records are never shown here.
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Tag ID (e.g. CriderGPT-A7X9K2) or scan URL"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) runLookup(input.trim()); }}
              className="h-12 font-mono flex-1"
              autoComplete="off"
            />
            <Button onClick={() => runLookup(input.trim())} disabled={!input.trim() || loading} className="h-12 px-5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
            </Button>
          </div>
          {nfcSupported && (
            <Button variant="outline" className="w-full h-12" onClick={startNfc} disabled={loading}>
              <Smartphone className="h-4 w-4 mr-2" /> Tap NFC Tag
            </Button>
          )}
          {lastTag && <p className="text-xs text-muted-foreground text-center">Last: <span className="font-mono">{lastTag}</span></p>}
        </CardContent>
      </Card>

      {error && !result?.registered && (
        <Card className="border-destructive/30">
          <CardContent className="p-5 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="font-semibold text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">This tag isn't registered in CriderGPT Smart ID.</p>
          </CardContent>
        </Card>
      )}

      {result?.registered && (
        <Card className={isLost ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Registered Animal
              {isLost && <Badge variant="destructive" className="ml-auto uppercase">{result.lost?.status}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {animal?.photo_url && (
              <img src={animal.photo_url} alt="" className="w-full max-h-48 object-cover rounded" />
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {animal?.name && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{animal.name}</span></div>}
              {animal?.species && <div><span className="text-muted-foreground">Species:</span> <span className="font-medium">{animal.species}</span></div>}
              {animal?.breed && <div><span className="text-muted-foreground">Breed:</span> <span className="font-medium">{animal.breed}</span></div>}
              {animal?.sex && <div><span className="text-muted-foreground">Sex:</span> <span className="font-medium">{animal.sex}</span></div>}
              {animal?.birth_date && <div><span className="text-muted-foreground">Born:</span> <span className="font-medium">{animal.birth_date}</span></div>}
              {animal?.tag_id && <div><span className="text-muted-foreground">Tag:</span> <span className="font-mono text-xs">{animal.tag_id}</span></div>}
            </div>

            {isLost && (result.lost?.instructions || result.lost?.last_seen_general_area) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1">
                <p className="font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Emergency Instructions
                </p>
                {result.lost?.instructions && <p>{result.lost.instructions}</p>}
                {result.lost?.last_seen_general_area && (
                  <p className="text-xs text-muted-foreground">Last seen area: {result.lost.last_seen_general_area}</p>
                )}
              </div>
            )}

            {result.public_profile_enabled === false && (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                The owner hasn't enabled a public contact page for this tag.
                If you found this animal, please contact CriderGPT support.
              </div>
            )}

            {result.owner_contact && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Contact owner{result.owner_contact.name ? `: ${result.owner_contact.name}` : ''}</p>
                  <div className="flex flex-col gap-2">
                    {result.owner_contact.phone && (
                      <Button asChild variant="outline" className="w-full justify-start h-11">
                        <a href={`tel:${result.owner_contact.phone}`}>
                          <Phone className="h-4 w-4 mr-2" /> {result.owner_contact.phone}
                        </a>
                      </Button>
                    )}
                    {result.owner_contact.email && (
                      <Button asChild variant="outline" className="w-full justify-start h-11">
                        <a href={`mailto:${result.owner_contact.email}`}>
                          <Mail className="h-4 w-4 mr-2" /> {result.owner_contact.email}
                        </a>
                      </Button>
                    )}
                  </div>
                  {result.owner_contact.preferred_method && (
                    <p className="text-xs text-muted-foreground">
                      Preferred contact: {result.owner_contact.preferred_method}
                    </p>
                  )}
                </div>
              </>
            )}

            {result.public_health && result.public_health.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Public Health Info</p>
                  {result.public_health.map((h) => (
                    <div key={h.id} className="rounded-md bg-muted/40 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{h.public_title}</span>
                        <Badge variant="outline" className="text-[10px]">{h.category}</Badge>
                      </div>
                      {h.public_summary && <p className="text-muted-foreground mt-1">{h.public_summary}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-[10px] text-muted-foreground text-center pt-2">
              🔒 Private records (notes, costs, vet info) are never shown in public lookups.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
