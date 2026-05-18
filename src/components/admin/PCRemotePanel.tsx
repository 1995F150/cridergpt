import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Monitor, Loader2, MousePointerClick, Keyboard, TerminalSquare, Camera, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Result = { ok?: boolean; status?: number; data?: any; error?: string; latency_ms?: number };

const INSTALL_SNIPPET = `:: 1. Install cloudflared:  https://github.com/cloudflare/cloudflared/releases/latest
:: 2. Run this on your PC:
curl -L https://cridergpt.com/voice-engine/start-pc-remote.cmd -o %TEMP%\\pc.cmd && %TEMP%\\pc.cmd

:: 3. Copy the TOKEN and the https://...trycloudflare.com URL it prints.
:: 4. Add as Supabase Edge Function Secrets:
::      HOME_SERVER_AGENT_URL   = the trycloudflare URL
::      HOME_SERVER_AGENT_TOKEN = the token`;

export function PCRemotePanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [shellCmd, setShellCmd] = useState('dir');
  const [typeText, setTypeText] = useState('');
  const [clickX, setClickX] = useState(500);
  const [clickY, setClickY] = useState(400);
  const [hotkey, setHotkey] = useState('ctrl+c');

  async function call(action: string, extra: Record<string, unknown> = {}): Promise<Result> {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('home-server-proxy', {
        body: { action, ...extra },
      });
      if (error) throw error;
      return data as Result;
    } catch (e: any) {
      toast.error(e?.message || 'request failed');
      return { error: e?.message };
    } finally {
      setBusy(null);
    }
  }

  function showResult(r: Result) {
    setOutput(JSON.stringify(r, null, 2));
  }

  async function doScreenshot() {
    const r = await call('pc-screenshot');
    const b64 = r?.data?.image_b64;
    if (b64) setScreenshot(`data:image/png;base64,${b64}`);
    else showResult(r);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor className="w-5 h-5" /> PC Remote Control</CardTitle>
          <CardDescription>
            Controls your Windows/Mac/Linux PC through the local agent + Cloudflare tunnel.
            Requires <code>HOME_SERVER_AGENT_URL</code> and <code>HOME_SERVER_AGENT_TOKEN</code> secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Button onClick={() => call('pc-sysinfo').then(showResult)} disabled={!!busy} variant="outline" className="justify-start">
            {busy === 'pc-sysinfo' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />}
            System Info
          </Button>
          <Button onClick={doScreenshot} disabled={!!busy} variant="outline" className="justify-start">
            {busy === 'pc-screenshot' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            Take Screenshot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TerminalSquare className="w-4 h-4" /> Shell Command</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input value={shellCmd} onChange={(e) => setShellCmd(e.target.value)} placeholder="dir / ls / whoami" />
            <Button onClick={() => call('command', { command: shellCmd }).then(showResult)} disabled={!!busy}>
              {busy === 'command' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MousePointerClick className="w-4 h-4" /> Mouse + Keyboard</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">X</Label>
              <Input type="number" value={clickX} onChange={(e) => setClickX(+e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input type="number" value={clickY} onChange={(e) => setClickY(+e.target.value)} />
            </div>
            <Button onClick={() => call('pc-click', { x: clickX, y: clickY }).then(showResult)} disabled={!!busy}>
              Click
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={typeText} onChange={(e) => setTypeText(e.target.value)} placeholder="Text to type" />
            <Button onClick={() => call('pc-type', { text: typeText }).then(showResult)} disabled={!!busy}>
              <Keyboard className="w-4 h-4 mr-2" /> Type
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={hotkey} onChange={(e) => setHotkey(e.target.value)} placeholder="ctrl+c" />
            <Button onClick={() => call('pc-hotkey', { keys: hotkey }).then(showResult)} disabled={!!busy} variant="outline">
              Hotkey
            </Button>
          </div>
        </CardContent>
      </Card>

      {screenshot && (
        <Card>
          <CardHeader><CardTitle className="text-base">Screenshot</CardTitle></CardHeader>
          <CardContent>
            <img src={screenshot} alt="PC screenshot" className="w-full rounded border border-border" />
          </CardContent>
        </Card>
      )}

      {output && (
        <Card>
          <CardHeader><CardTitle className="text-base">Last Response</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-80">{output}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Setup (run on your PC)</CardTitle></CardHeader>
        <CardContent>
          <Textarea readOnly value={INSTALL_SNIPPET} className="font-mono text-xs h-44" />
        </CardContent>
      </Card>
    </div>
  );
}
