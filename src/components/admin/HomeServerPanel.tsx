import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Activity, TerminalSquare, Monitor, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
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

export function HomeServerPanel() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [command, setCommand] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdOutput, setCmdOutput] = useState<string>('');
  const [vmUrl, setVmUrl] = useState<string>('https://vm.cridergpt.com');

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

  async function runCommand() {
    if (!command.trim()) return;
    setCmdLoading(true);
    setCmdOutput('');
    try {
      const data = await callProxy('command', { command });
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
                Connects to your Ubuntu host via Cloudflare Tunnel (vm.cridergpt.com)
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
              ℹ️ Command execution disabled — set <code className="font-mono">HOME_SERVER_AGENT_URL</code> secret to enable.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="vm">
        <TabsList>
          <TabsTrigger value="vm" className="gap-2"><Monitor className="h-4 w-4" /> VM Viewer</TabsTrigger>
          <TabsTrigger value="commands" className="gap-2"><TerminalSquare className="h-4 w-4" /> Commands</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Activity className="h-4 w-4" /> Health</TabsTrigger>
        </TabsList>

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
              <div className="flex gap-2">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder='e.g. "uptime" or "docker ps"'
                  onKeyDown={(e) => e.key === 'Enter' && !cmdLoading && runCommand()}
                  className="font-mono"
                />
                <Button onClick={runCommand} disabled={cmdLoading || !command.trim()}>
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
