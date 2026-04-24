import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Server, Activity, TerminalSquare, Monitor, RefreshCw, ExternalLink,
  Loader2, Copy, Check, Download, Cloud, Youtube, Wifi, WifiOff, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StatusResult {
  online: boolean;
  http_status: number;
  latency_ms: number;
  vm_url: string;
  agent_configured: boolean;
  error: string | null;
  checked_at: string;
}

const SERVER_USER = 'cridergpt2026';
const SERVER_IP = '192.168.40.198';
const SUPABASE_REF = 'udpldrrpebdyuiqdtqnq';

const QUICK_COMMANDS: { label: string; cmd: string }[] = [
  { label: 'uptime', cmd: 'uptime' },
  { label: 'df -h', cmd: 'df -h' },
  { label: 'free -h', cmd: 'free -h' },
  { label: 'docker ps', cmd: 'docker ps' },
  { label: 'logs', cmd: 'docker logs --tail 100 cridergpt' },
  { label: 'restart', cmd: 'docker restart cridergpt' },
  { label: 'git pull', cmd: 'cd ~/cridergpt && git pull' },
  { label: 'sync db', cmd: 'cd ~/cridergpt && bash scripts/sync-from-supabase.sh' },
];

const AGENT_INSTALL_SCRIPT = `#!/usr/bin/env bash
# Run ONCE on cridergpt2026@192.168.40.198 over SSH.
set -e
sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv git curl ffmpeg
# yt-dlp for the YouTube downloader tab
sudo curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
mkdir -p ~/cridergpt-agent && cd ~/cridergpt-agent
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip flask gunicorn
cat > agent.py <<'PY'
import os, subprocess
from flask import Flask, request, jsonify
app = Flask(__name__)
TOKEN = os.environ.get("AGENT_TOKEN", "change-me")

@app.post("/run")
def run():
    if request.headers.get("X-Agent-Token") != TOKEN:
        return jsonify(error="unauthorized"), 401
    cmd = (request.json or {}).get("command", "").strip()
    if not cmd: return jsonify(error="missing command"), 400
    try:
        out = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)
        return jsonify(stdout=out.stdout, stderr=out.stderr, code=out.returncode)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.get("/health")
def health(): return jsonify(ok=True)
PY
echo "Done. Start with:  AGENT_TOKEN=yourtoken gunicorn -w 2 -b 0.0.0.0:5005 agent:app"`;

const CRIDERGPT_CLONE_SCRIPT = `#!/usr/bin/env bash
set -e
PROJECT_REF="${SUPABASE_REF}"
WORKDIR="$HOME/cridergpt"
mkdir -p "$WORKDIR" && cd "$WORKDIR"
if ! command -v supabase >/dev/null 2>&1; then
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \\
    | sudo tar -xz -C /usr/local/bin supabase
fi
supabase login || true
supabase link --project-ref "$PROJECT_REF" || true
supabase db pull
mkdir -p backups
supabase db dump --data-only -f "backups/data-$(date +%F).sql" || true
echo "✅ CriderGPT mirror synced at $WORKDIR"`;

interface TermLine {
  kind: 'in' | 'out' | 'err' | 'sys';
  text: string;
  ts: string;
}

export function HomeServerPanel() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const [history, setHistory] = useState<TermLine[]>([
    { kind: 'sys', text: `Termius-style session ready. Connecting to ${SERVER_USER}@${SERVER_IP} via Supabase proxy...`, ts: new Date().toLocaleTimeString() },
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [vmUrl, setVmUrl] = useState<string>('https://vm.cridergpt.com');
  const [copied, setCopied] = useState<string | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  // YouTube state
  const [ytUrl, setYtUrl] = useState('');
  const [ytFormat, setYtFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [ytQuality, setYtQuality] = useState('best');
  const [ytSubs, setYtSubs] = useState(false);
  const [ytThumb, setYtThumb] = useState(false);
  const [ytPlaylist, setYtPlaylist] = useState(false);
  const [ytStart, setYtStart] = useState('');
  const [ytEnd, setYtEnd] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [ytPreviewCmd, setYtPreviewCmd] = useState('');

  async function callProxy(action: string, extra: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke('home-server-proxy', {
      body: { action, ...extra },
    });
    if (error) {
      let detail = error.message;
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) detail = String(body.error);
        }
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return data;
  }

  async function refreshStatus() {
    setStatusLoading(true);
    try {
      const data = await callProxy('status');
      setStatus(data as StatusResult);
      if (data?.vm_url) setVmUrl(data.vm_url);
    } catch (e) {
      toast.error('Status check failed', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setStatusLoading(false);
    }
  }

  function appendLines(lines: TermLine[]) {
    setHistory((h) => [...h, ...lines]);
    requestAnimationFrame(() => {
      termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  async function runCommand(override?: string) {
    const target = (override ?? command).trim();
    if (!target) return;
    const ts = new Date().toLocaleTimeString();
    appendLines([{ kind: 'in', text: target, ts }]);
    setCmdHistory((h) => [target, ...h.filter((c) => c !== target)].slice(0, 50));
    setHistoryIdx(-1);
    setCommand('');
    setCmdLoading(true);
    try {
      const data = await callProxy('command', { command: target });
      const out = String(data?.output ?? '');
      if (data?.error) {
        appendLines([{ kind: 'err', text: data.error, ts: new Date().toLocaleTimeString() }]);
      } else if (out) {
        appendLines([{ kind: 'out', text: out, ts: new Date().toLocaleTimeString() }]);
      } else {
        appendLines([{ kind: 'sys', text: `(no output) ${data?.latency_ms ?? 0}ms`, ts: new Date().toLocaleTimeString() }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLines([{ kind: 'err', text: msg, ts: new Date().toLocaleTimeString() }]);
    } finally {
      setCmdLoading(false);
    }
  }

  function onTermKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !cmdLoading) {
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      if (next >= 0 && cmdHistory[next]) {
        setHistoryIdx(next);
        setCommand(cmdHistory[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) {
        setHistoryIdx(-1);
        setCommand('');
      } else {
        setHistoryIdx(next);
        setCommand(cmdHistory[next] ?? '');
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setHistory([]);
    }
  }

  async function runYoutube() {
    if (!/^https?:\/\//i.test(ytUrl)) {
      toast.error('Enter a valid YouTube URL');
      return;
    }
    setYtLoading(true);
    try {
      const data = await callProxy('youtube', {
        url: ytUrl,
        format: ytFormat,
        quality: ytQuality,
        subtitles: ytSubs,
        thumbnail: ytThumb,
        playlist: ytPlaylist,
        startTime: ytStart,
        endTime: ytEnd,
      });
      if (data?.command) setYtPreviewCmd(data.command);
      if (data?.error) {
        toast.error('Download issue', { description: data.error });
        appendLines([
          { kind: 'sys', text: `[YouTube] ${data.command}`, ts: new Date().toLocaleTimeString() },
          { kind: 'err', text: data.error, ts: new Date().toLocaleTimeString() },
        ]);
      } else {
        toast.success(`Saved to ~/Downloads/cridergpt-yt`);
        appendLines([
          { kind: 'sys', text: `[YouTube] ${data?.command ?? ''}`, ts: new Date().toLocaleTimeString() },
          { kind: 'out', text: String(data?.output ?? '(no output)'), ts: new Date().toLocaleTimeString() },
        ]);
      }
    } catch (e) {
      toast.error('Failed', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setYtLoading(false);
    }
  }

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(null), 1500);
  }

  useEffect(() => { refreshStatus(); }, []);

  const qualityOptions = ytFormat === 'mp4'
    ? [
        { v: 'best', l: 'Best available' },
        { v: '2160', l: '2160p (4K)' },
        { v: '1440', l: '1440p (2K)' },
        { v: '1080', l: '1080p' },
        { v: '720', l: '720p' },
        { v: '480', l: '480p' },
        { v: '360', l: '360p' },
      ]
    : [
        { v: '320k', l: '320 kbps' },
        { v: '256k', l: '256 kbps' },
        { v: '192k', l: '192 kbps' },
        { v: '128k', l: '128 kbps' },
      ];

  return (
    <div className="space-y-6">
      {/* Connection bar */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Server className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Home Server
                  {status ? (
                    <Badge variant={status.online ? 'default' : 'destructive'} className="gap-1.5">
                      {status.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {status.online ? 'Online' : 'Offline'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Unknown</Badge>
                  )}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {SERVER_USER}@{SERVER_IP} · {status ? `${status.latency_ms}ms · HTTP ${status.http_status || '—'}` : 'no health check yet'}
                </CardDescription>
              </div>
            </div>
            <Button onClick={refreshStatus} disabled={statusLoading} size="sm" variant="outline" className="gap-2">
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
          {status && !status.agent_configured && (
            <p className="mt-2 text-xs text-muted-foreground">
              ℹ️ Agent not linked. Use the <strong>Setup</strong> tab to install it, then add <code className="font-mono">HOME_SERVER_AGENT_URL</code> as a Supabase secret.
            </p>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="terminal">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="terminal" className="gap-1.5"><TerminalSquare className="h-4 w-4" /> Terminal</TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5"><Youtube className="h-4 w-4" /> YouTube</TabsTrigger>
          <TabsTrigger value="vm" className="gap-1.5"><Monitor className="h-4 w-4" /> VM</TabsTrigger>
          <TabsTrigger value="setup" className="gap-1.5"><Download className="h-4 w-4" /> Setup</TabsTrigger>
          <TabsTrigger value="clone" className="gap-1.5"><Cloud className="h-4 w-4" /> Clone</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Activity className="h-4 w-4" /> Health</TabsTrigger>
        </TabsList>

        {/* TERMINAL — Termius style */}
        <TabsContent value="terminal">
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-[hsl(220_15%_8%)]">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220_15%_12%)] border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[hsl(0_70%_55%)]" />
                <span className="h-3 w-3 rounded-full bg-[hsl(45_90%_55%)]" />
                <span className="h-3 w-3 rounded-full bg-[hsl(140_60%_45%)]" />
                <span className="ml-3 text-xs font-mono text-[hsl(220_10%_70%)]">
                  {SERVER_USER}@{SERVER_IP}: ~
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono border-border/40 text-[hsl(220_10%_70%)]">SSH · Proxy</Badge>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[hsl(220_10%_70%)] hover:text-foreground" onClick={() => setHistory([])}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick command chips */}
            <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-[hsl(220_15%_10%)] border-b border-border/40">
              {QUICK_COMMANDS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => runCommand(q.cmd)}
                  disabled={cmdLoading}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-[hsl(220_15%_16%)] text-[hsl(180_60%_70%)] hover:bg-[hsl(220_15%_22%)] disabled:opacity-50 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Output */}
            <div
              ref={termRef}
              className="h-[420px] overflow-auto p-4 font-mono text-[13px] leading-relaxed bg-[hsl(220_15%_8%)]"
              onClick={() => (document.getElementById('term-input') as HTMLInputElement)?.focus()}
            >
              {history.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {line.kind === 'in' && (
                    <div>
                      <span className="text-[hsl(140_60%_55%)]">{SERVER_USER}@cridergpt</span>
                      <span className="text-[hsl(220_10%_60%)]">:</span>
                      <span className="text-[hsl(210_70%_65%)]">~</span>
                      <span className="text-[hsl(220_10%_60%)]">$ </span>
                      <span className="text-foreground">{line.text}</span>
                    </div>
                  )}
                  {line.kind === 'out' && <div className="text-[hsl(220_10%_85%)]">{line.text}</div>}
                  {line.kind === 'err' && <div className="text-[hsl(0_75%_65%)]">{line.text}</div>}
                  {line.kind === 'sys' && <div className="text-[hsl(45_70%_60%)] italic">— {line.text}</div>}
                </div>
              ))}
              {cmdLoading && (
                <div className="text-[hsl(45_70%_60%)] flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> running...
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220_15%_10%)] border-t border-border/40 font-mono text-[13px]">
              <span className="text-[hsl(140_60%_55%)] shrink-0">{SERVER_USER}@cridergpt</span>
              <span className="text-[hsl(220_10%_60%)]">:</span>
              <span className="text-[hsl(210_70%_65%)]">~</span>
              <span className="text-[hsl(220_10%_60%)] mr-1">$</span>
              <input
                id="term-input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={onTermKey}
                disabled={cmdLoading}
                placeholder="type a command — ↑/↓ history, Ctrl+L clears"
                className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-[hsl(220_10%_40%)]"
                autoFocus
              />
            </div>
          </div>
        </TabsContent>

        {/* YOUTUBE downloader */}
        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Youtube className="h-5 w-5 text-[hsl(0_75%_55%)]" /> YouTube → MP4 / MP3
              </CardTitle>
              <CardDescription>
                Runs <code className="font-mono">yt-dlp</code> on the home server. Files save to <code className="font-mono">~/Downloads/cridergpt-yt</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yt-url">Video URL</Label>
                <Input
                  id="yt-url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={ytFormat} onValueChange={(v) => { setYtFormat(v as 'mp4' | 'mp3'); setYtQuality(v === 'mp4' ? 'best' : '192k'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (video)</SelectItem>
                      <SelectItem value="mp3">MP3 (audio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{ytFormat === 'mp4' ? 'Max resolution' : 'Bitrate'}</Label>
                  <Select value={ytQuality} onValueChange={setYtQuality}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {qualityOptions.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Advanced</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="yt-start" className="text-xs">Start (HH:MM:SS)</Label>
                    <Input id="yt-start" value={ytStart} onChange={(e) => setYtStart(e.target.value)} placeholder="00:00:30" className="font-mono h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="yt-end" className="text-xs">End (HH:MM:SS)</Label>
                    <Input id="yt-end" value={ytEnd} onChange={(e) => setYtEnd(e.target.value)} placeholder="00:01:45" className="font-mono h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <span className="text-sm">Subtitles</span>
                    <Switch checked={ytSubs} onCheckedChange={setYtSubs} />
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <span className="text-sm">Thumbnail</span>
                    <Switch checked={ytThumb} onCheckedChange={setYtThumb} />
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <span className="text-sm">Full playlist</span>
                    <Switch checked={ytPlaylist} onCheckedChange={setYtPlaylist} />
                  </label>
                </div>
              </div>

              <Button onClick={runYoutube} disabled={ytLoading || !ytUrl.trim()} className="w-full gap-2">
                {ytLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download {ytFormat.toUpperCase()}
              </Button>

              {ytPreviewCmd && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Generated command</Label>
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => copy('yt-dlp command', ytPreviewCmd)}>
                      {copied === 'yt-dlp command' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all">
{ytPreviewCmd}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vm">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">noVNC Viewer</CardTitle>
                <CardDescription>Embedded view of the Win11 VM</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <a href={vmUrl} target="_blank" rel="noreferrer">Open in new tab <ExternalLink className="h-4 w-4" /></a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <iframe src={vmUrl} title="Home VM" className="h-full w-full" allow="clipboard-read; clipboard-write; fullscreen" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SSH + Agent Install</CardTitle>
              <CardDescription>SSH into the server, then paste this script. Installs the Flask agent on port 5005 and yt-dlp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm flex items-center justify-between gap-2">
                <span>ssh {SERVER_USER}@{SERVER_IP}</span>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => copy('SSH command', `ssh ${SERVER_USER}@${SERVER_IP}`)}>
                  {copied === 'SSH command' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Agent install script</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy('agent script', AGENT_INSTALL_SCRIPT)}>
                    {copied === 'agent script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy script
                  </Button>
                </div>
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-auto">
{AGENT_INSTALL_SCRIPT}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Expose <code>http://YOUR_IP:5005</code> via your router or Cloudflare Tunnel, then add <code>HOME_SERVER_AGENT_URL</code> as a Supabase secret.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clone">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clone CriderGPT to Home Server</CardTitle>
              <CardDescription>Pulls schema + edge functions from project <code>{SUPABASE_REF}</code>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">sync-from-supabase.sh</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy('clone script', CRIDERGPT_CLONE_SCRIPT)}>
                  {copied === 'clone script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy script
                </Button>
              </div>
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
{CRIDERGPT_CLONE_SCRIPT}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle className="text-base">Connection Details</CardTitle></CardHeader>
            <CardContent>
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-auto">
{JSON.stringify(status ?? { message: 'No status yet — click Refresh' }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
