import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Hammer, Download, RefreshCw, Loader2, Copy, Check, Terminal } from 'lucide-react';
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
  const [ghUser, setGhUser] = useState(DEFAULT_GH_USER);
  const [status, setStatus] = useState<BuilderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied', description: label });
    setTimeout(() => setCopied(null), 1500);
  };

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
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Builder host</label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              onBlur={(e) => saveHost(e.target.value)}
              placeholder="http://your-server:5100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">GitHub username</label>
            <Input
              value={ghUser}
              onChange={(e) => setGhUser(e.target.value)}
              onBlur={(e) => { localStorage.setItem('builderGithubUser', e.target.value); }}
              placeholder="1995F150"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">One-shot install command (paste on Ubuntu server)</label>
            <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
{`GITHUB_USER=${ghUser} bash -c "$(curl -fsSL https://cridergpt.com/voice-engine/android-builder/install.sh)"`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            Point the host at your Ubuntu builder (LAN IP, Tailscale, or Cloudflare Tunnel). Saved locally on this device.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> Server Setup — Copy / Paste in Termius
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Every command you need to stand up the auto-builder on a fresh Ubuntu box. Run them top to bottom.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              label: '1. Update Ubuntu',
              cmd: 'sudo apt-get update -y && sudo apt-get upgrade -y',
              note: 'Brings the box current before installing anything.',
            },
            {
              label: '2. One-shot installer (does everything)',
              cmd: `GITHUB_USER=${ghUser} bash -c "$(curl -fsSL https://cridergpt.com/voice-engine/android-builder/install.sh)"`,
              note: 'Installs JDK 21, Android SDK, Gradle, Node 20, generates a 25-year signing keystore, clones your repo, and registers the systemd service on port 5100.',
            },
            {
              label: '3. Check the daemon is alive',
              cmd: 'sudo systemctl status cridergpt-builder',
              note: 'Should say "active (running)". Press q to exit.',
            },
            {
              label: '4. Watch live build logs',
              cmd: 'sudo journalctl -fu cridergpt-builder',
              note: 'Tail the daemon. Leave open while you push a commit.',
            },
            {
              label: '5. Trigger a build manually',
              cmd: 'curl -X POST http://localhost:5100/build',
              note: 'Same call the GitHub webhook makes. Use to test end-to-end.',
            },
            {
              label: '6. Find the finished APK / AAB',
              cmd: 'ls -lh ~/cridergpt-builder/builds/',
              note: 'Latest signed CriderGPT-vX.X.X-buildXXXX.apk + .aab live here.',
            },
            {
              label: '7. Pull the APK to your phone (from your laptop)',
              cmd: 'scp YOUR_USER@YOUR_SERVER:~/cridergpt-builder/builds/CriderGPT-*.apk ./',
              note: 'Replace YOUR_USER and YOUR_SERVER. Or download via the buttons above when host is reachable.',
            },
            {
              label: '8. Back up your keystore (do this ONCE — never lose it)',
              cmd: 'cp ~/cridergpt-builder/keys/cridergpt.jks ~/cridergpt.jks.BACKUP && ls -l ~/cridergpt.jks.BACKUP',
              note: 'Lose this file = you can never update the app on Play Store. Copy it to a USB drive too.',
            },
            {
              label: '9. (Optional) Expose to the internet via Cloudflare Tunnel',
              cmd: 'curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb && cloudflared tunnel login',
              note: 'Needed if you want to call the builder from cridergpt.com (HTTPS → HTTP is blocked otherwise).',
            },
            {
              label: '10. Restart the daemon after a config change',
              cmd: 'sudo systemctl restart cridergpt-builder',
              note: 'Use after editing /etc/systemd/system/cridergpt-builder.service.',
            },
          ].map(({ label, cmd, note }) => (
            <div key={label} className="space-y-1 border-l-2 border-primary/40 pl-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => copy(label, cmd)}
                >
                  {copied === label ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied === label ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{cmd}</pre>
              <p className="text-[10px] text-muted-foreground">{note}</p>
            </div>
          ))}
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
