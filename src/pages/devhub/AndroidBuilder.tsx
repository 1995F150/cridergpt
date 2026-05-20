import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Hammer, Download, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BuilderStatus {
  state: 'idle' | 'building' | 'failed';
  last_tag: string | null;
  last_error: string | null;
  available_apks: string[];
  available_aabs: string[];
  log_tail: string;
}

const DEFAULT_HOST = localStorage.getItem('builderHost') || 'http://localhost:5100';
const DEFAULT_GH_USER = localStorage.getItem('builderGithubUser') || '1995F150';

export default function AndroidBuilder() {
  const [host, setHost] = useState(DEFAULT_HOST);
  const [status, setStatus] = useState<BuilderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${host}/status`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setStatus(await r.json());
    } catch (e: any) {
      toast({ title: 'Cannot reach builder', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const triggerBuild = async () => {
    setTriggering(true);
    try {
      const r = await fetch(`${host}/build`, { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: 'Build queued', description: 'Watch the log tail below.' });
      setTimeout(fetchStatus, 2000);
    } catch (e: any) {
      toast({ title: 'Trigger failed', description: e.message, variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  const saveHost = (h: string) => {
    localStorage.setItem('builderHost', h);
    setHost(h);
  };

  const stateBadge = status?.state === 'building'
    ? <Badge className="bg-amber-500">Building…</Badge>
    : status?.state === 'failed'
      ? <Badge variant="destructive">Failed</Badge>
      : <Badge className="bg-emerald-600">Idle</Badge>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Hammer className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Android Auto-Build</h1>
        {status && stateBadge}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Server</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onBlur={(e) => saveHost(e.target.value)}
            placeholder="http://your-server:5100"
          />
          <p className="text-xs text-muted-foreground">
            Point this at your Ubuntu builder. Use Tailscale, Cloudflare Tunnel,
            or your LAN IP. Saved locally on this device.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={triggerBuild} disabled={triggering || status?.state === 'building'}>
          {triggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hammer className="w-4 h-4 mr-2" />}
          Build now
        </Button>
        <Button variant="outline" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {status?.last_tag && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Latest build · {status.last_tag}</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <a href={`${host}/latest.apk`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><Download className="w-4 h-4 mr-2" />APK (sideload)</Button>
            </a>
            <a href={`${host}/latest.aab`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><Download className="w-4 h-4 mr-2" />AAB (Play Store)</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {status?.last_error && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-sm text-destructive">Last error</CardTitle></CardHeader>
          <CardContent><code className="text-xs">{status.last_error}</code></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent builds</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs space-y-1 font-mono">
            {(status?.available_apks ?? []).map(f => (<div key={f}>{f}</div>))}
            {(!status || status.available_apks.length === 0) && (
              <span className="text-muted-foreground">No builds yet.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Log tail</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-[10px] bg-muted p-2 rounded max-h-80 overflow-auto whitespace-pre-wrap">
{status?.log_tail || 'No log yet.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
