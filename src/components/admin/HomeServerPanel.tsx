import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Server, Activity, TerminalSquare, Monitor, RefreshCw, ExternalLink,
  Loader2, Copy, Check, Download, Cloud,
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
  { label: 'Uptime', cmd: 'uptime' },
  { label: 'Disk usage', cmd: 'df -h' },
  { label: 'Memory', cmd: 'free -h' },
  { label: 'Docker ps', cmd: 'docker ps' },
  { label: 'CriderGPT logs', cmd: 'docker logs --tail 100 cridergpt' },
  { label: 'Restart CriderGPT', cmd: 'docker restart cridergpt' },
  { label: 'Pull latest', cmd: 'cd ~/cridergpt && git pull' },
  { label: 'Sync DB from Supabase', cmd: 'cd ~/cridergpt && bash scripts/sync-from-supabase.sh' },
];

const AGENT_INSTALL_SCRIPT = `#!/usr/bin/env bash
# Run this ONCE on your home server (cridergpt2026@192.168.40.198) over SSH.
# It installs a tiny HTTP agent that the admin panel can call.
set -e
sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv git curl
mkdir -p ~/cridergpt-agent && cd ~/cridergpt-agent
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip flask gunicorn
cat > agent.py <<'PY'
import os, subprocess, shlex
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
        out = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        return jsonify(stdout=out.stdout, stderr=out.stderr, code=out.returncode)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.get("/health")
def health(): return jsonify(ok=True)
PY
echo "Done. Start with:  AGENT_TOKEN=yourtoken gunicorn -w 2 -b 0.0.0.0:5005 agent:app"`;

const CRIDERGPT_CLONE_SCRIPT = `#!/usr/bin/env bash
# Clones / refreshes a local CriderGPT mirror tied to your Supabase project.
# Run on the home server after the agent is up.
set -e
PROJECT_REF="${SUPABASE_REF}"
WORKDIR="$HOME/cridergpt"
mkdir -p "$WORKDIR" && cd "$WORKDIR"

# 1. Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \\
    | sudo tar -xz -C /usr/local/bin supabase
fi

# 2. Login (one-time, opens browser-less device flow)
supabase login || true

# 3. Link to remote project
supabase link --project-ref "$PROJECT_REF" || true

# 4. Pull schema + edge functions + migrations
supabase db pull
supabase functions download home-server-proxy || true

# 5. Optional: dump data snapshot
mkdir -p backups
supabase db dump --data-only -f "backups/data-$(date +%F).sql" || true

echo "✅ CriderGPT mirror synced at $WORKDIR"`;

export function HomeServerPanel() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdOutput, setCmdOutput] = useState<string>('');
  const [vmUrl, setVmUrl] = useState<string>('https://vm.cridergpt.com');
  const [copied, setCopied] = useState<string | null>(null);

  async function callProxy(action: string, extra: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke('home-server-proxy', {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
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

  async function runCommand(override?: string) {
    const target = (override ?? command).trim();
    if (!target) return;
    setCmdLoading(true);
    setCmdOutput('');
    try {
      const data = await callProxy('command', { command: target });
      if (data?.error) {
        setCmdOutput(`ERROR: ${data.error}`);
        toast.error('Command failed', { description: data.error });
      } else {
        setCmdOutput(String(data?.output ?? ''));
        toast.success(`Completed in ${data?.latency_ms ?? 0}ms`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCmdOutput(`ERROR: ${msg}`);
      toast.error('Command failed', { description: msg });
    } finally {
      setCmdLoading(false);
    }
  }

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(null), 1500);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Server className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Home Server Connection</CardTitle>
              <CardDescription>
                {SERVER_USER}@{SERVER_IP} · tunnel: vm.cridergpt.com
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {status ? (
                <Badge variant={status.online ? 'default' : 'destructive'} className="gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${status.online ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                  {status.online ? 'Online' : 'Offline'}
                </Badge>
              ) : (
                <Badge variant="secondary">Unknown</Badge>
              )}
              {status && (
                <span className="text-sm text-muted-foreground">
                  {status.latency_ms}ms · HTTP {status.http_status || '—'}
                </span>
              )}
            </div>
            <Button onClick={refreshStatus} disabled={statusLoading} size="sm" variant="outline" className="gap-2">
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
          {status?.error && (
            <p className="mt-3 text-sm text-destructive">{status.error}</p>
          )}
          {status && !status.agent_configured && (
            <p className="mt-3 text-xs text-muted-foreground">
              ℹ️ Command runner disabled until <code className="font-mono">HOME_SERVER_AGENT_URL</code> secret is set. Use the Setup tab to install the agent first.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup" className="gap-2"><Download className="h-4 w-4" /> Setup</TabsTrigger>
          <TabsTrigger value="vm" className="gap-2"><Monitor className="h-4 w-4" /> VM Viewer</TabsTrigger>
          <TabsTrigger value="commands" className="gap-2"><TerminalSquare className="h-4 w-4" /> Commands</TabsTrigger>
          <TabsTrigger value="clone" className="gap-2"><Cloud className="h-4 w-4" /> Clone CriderGPT</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Activity className="h-4 w-4" /> Health</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SSH + Agent Install</CardTitle>
              <CardDescription>
                SSH into the server, then paste this script. It installs a small Flask agent on port 5005.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm flex items-center justify-between gap-2">
                <span>ssh {SERVER_USER}@{SERVER_IP}</span>
                <Button size="sm" variant="ghost" className="gap-1.5"
                  onClick={() => copy('SSH command', `ssh ${SERVER_USER}@${SERVER_IP}`)}>
                  {copied === 'SSH command' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Agent install script</p>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => copy('agent script', AGENT_INSTALL_SCRIPT)}>
                    {copied === 'agent script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy script
                  </Button>
                </div>
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-auto">
{AGENT_INSTALL_SCRIPT}
                </pre>
              </div>

              <p className="text-xs text-muted-foreground">
                After it's running, expose <code>http://YOUR_IP:5005</code> via your router or Cloudflare Tunnel, then add <code>HOME_SERVER_AGENT_URL</code> as a Supabase secret to enable the Commands tab.
              </p>
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
                <a href={vmUrl} target="_blank" rel="noreferrer">
                  Open in new tab <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <iframe
                  src={vmUrl}
                  title="Home VM"
                  className="h-full w-full"
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                If blank, the tunnel may be down or Cloudflare Access is blocking embedding. Use "Open in new tab".
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Command</CardTitle>
              <CardDescription>
                Forwarded to the home server agent. Requires <code>HOME_SERVER_AGENT_URL</code> secret.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_COMMANDS.map((q) => (
                  <Button
                    key={q.label}
                    size="sm"
                    variant="outline"
                    onClick={() => { setCommand(q.cmd); runCommand(q.cmd); }}
                    disabled={cmdLoading}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder='e.g. "uptime" or "docker ps"'
                  onKeyDown={(e) => e.key === 'Enter' && !cmdLoading && runCommand()}
                  className="font-mono"
                />
                <Button onClick={() => runCommand()} disabled={cmdLoading || !command.trim()}>
                  {cmdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
                </Button>
              </div>
              {cmdOutput && (
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
                  {cmdOutput}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clone">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clone CriderGPT to Home Server</CardTitle>
              <CardDescription>
                One-shot script: installs Supabase CLI, links to project <code>{SUPABASE_REF}</code>, pulls schema + edge functions, and snapshots data into <code>~/cridergpt/backups</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">sync-from-supabase.sh</p>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => copy('clone script', CRIDERGPT_CLONE_SCRIPT)}>
                  {copied === 'clone script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy script
                </Button>
              </div>
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
{CRIDERGPT_CLONE_SCRIPT}
              </pre>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Once installed</strong>, you can re-run a sync anytime from the Commands tab via the <em>"Sync DB from Supabase"</em> quick button.</p>
                <p>Save the script to <code>~/cridergpt/scripts/sync-from-supabase.sh</code> and <code>chmod +x</code> it for the quick-button to work.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection Details</CardTitle>
            </CardHeader>
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
