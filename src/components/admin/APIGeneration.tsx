import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Key, Link as LinkIcon, Shield, Zap } from 'lucide-react';

interface ApiKey {
  id: string;
  label: string | null;
  permissions: any;
  active: boolean;
  rate_limit_per_minute: number | null;
  created_at: string;
  revoked_at?: string | null;
}

interface ApiLog {
  id: number;
  user_email: string | null;
  endpoint: string | null;
  command: string | null;
  status: string | null;
  created_at: string;
  flags: any;
}

interface Keyword {
  id: string;
  keyword: string;
  action: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function APIGeneration() {
  const { toast } = useToast();
  const [killSwitch, setKillSwitch] = useState(false);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [usage, setUsage] = useState<Array<{ day: string; endpoint: string; calls: number }>>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPerms, setNewPerms] = useState('{"read_training": true, "write_training": false, "endpoints": ["pc_agent"] }');
  const [newRate, setNewRate] = useState<number>(60);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [kwModalOpen, setKwModalOpen] = useState(false);
  const [kwData, setKwData] = useState<{ id?: string; keyword: string; action_name: string; description?: string; active?: boolean }>({ keyword: '', action_name: '' });
  const [logFilter, setLogFilter] = useState<{ email: string; from: string; to: string }>({ email: '', from: '', to: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke('cridergpt-admin', { body: { action: 'get_settings' } });
      if (data?.settings) setKillSwitch(!!data.settings.kill_switch);
      await refreshKeys();
      await refreshKeywords();
      await refreshLogs();
      await refreshUsage();
    })();
  }, []);

  async function refreshKeys() {
    const { data, error } = await supabase.functions.invoke('cridergpt-admin', { body: { action: 'list_keys' } });
    if (!error) setKeys(data?.keys || []);
  }

  async function refreshLogs() {
    const payload: any = { action: 'list_logs' };
    if (logFilter.email) payload.user_email = logFilter.email;
    if (logFilter.from) payload.from = logFilter.from;
    if (logFilter.to) payload.to = logFilter.to;
    const { data, error } = await supabase.functions.invoke('cridergpt-admin', { body: payload });
    if (!error) setLogs(data?.logs || []);

    // Realtime subscribe for new logs
    const channel = supabase
      .channel('cridergpt_api_logs_stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cridergpt_api_logs' }, (payload) => {
        setLogs((prev) => [payload.new as any as ApiLog, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async function refreshKeywords() {
    const { data, error } = await supabase.from('api_keywords').select('*').order('updated_at', { ascending: false });
    if (!error) setKeywords(data as any);
  }

  async function refreshUsage() {
    const { data, error } = await supabase
      .from('cridergpt_api_usage_daily')
      .select('day, endpoint, calls')
      .gte('day', new Date(Date.now() - 7*24*60*60*1000).toISOString());
    if (!error && data) setUsage(data as any);
  }

  async function toggleKillSwitch(val: boolean) {
    setKillSwitch(val);
    const { error } = await supabase.functions.invoke('cridergpt-admin', { body: { action: 'set_kill_switch', kill: val } });
    if (error) toast({ title: 'Error', description: 'Failed to update kill switch', variant: 'destructive' });
  }

  async function generateKey() {
    try {
      const perms = JSON.parse(newPerms || '{}');
      const { data, error } = await supabase.functions.invoke('cridergpt-admin', {
        body: { action: 'generate_key', label: newLabel || undefined, permissions: perms, rate_limit_per_minute: newRate }
      });
      if (error) throw error;
      setPlainKey(data?.key || null);
      toast({ title: 'API Key Created', description: 'Copy the key now. It will not be shown again.' });
      setGenOpen(false);
      await refreshKeys();
    } catch (e: any) {
      // Fallback: client-side generation with server insert (admin-only)
      try {
        const perms = JSON.parse(newPerms || '{}');
        const plain = await (async () => {
          const arr = new Uint8Array(56);
          crypto.getRandomValues(arr);
          const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          return Array.from(arr, (b) => alphabet[b % alphabet.length]).join('');
        })();
        const enc = new TextEncoder();
        const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
        const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

        const { data: userRes } = await supabase.auth.getUser();
        const createdBy = userRes?.user?.id || null;

        const { error: insertErr } = await supabase.from('cridergpt_api_keys').insert({
          label: newLabel || null,
          key_hash: hashHex,
          permissions: perms,
          rate_limit_per_minute: newRate || 60,
          created_by: createdBy,
        });
        if (insertErr) throw insertErr;

        setPlainKey(plain);
        toast({ title: 'API Key Created (fallback)', description: 'Copy the key now. It will not be shown again.' });
        setGenOpen(false);
        await refreshKeys();
      } catch (ef: any) {
        toast({ title: 'Error', description: ef.message || e.message || 'Failed to generate key', variant: 'destructive' });
      }
    }
  }

  async function revokeKey(id: string) {
    const { error } = await supabase.functions.invoke('cridergpt-admin', { body: { action: 'revoke_key', id } });
    if (error) return toast({ title: 'Error', description: 'Failed to revoke key', variant: 'destructive' });
    await refreshKeys();
  }

  async function saveKeyword() {
    if (!kwData.keyword || !kwData.action_name) {
      toast({ title: 'Missing fields', description: 'Keyword and action are required', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.functions.invoke('cridergpt-admin', { body: { action: 'upsert_keyword', ...kwData } });
    if (error) return toast({ title: 'Error', description: 'Failed to save keyword', variant: 'destructive' });
    setKwModalOpen(false);
    setKwData({ keyword: '', action_name: '' });
    await refreshKeywords();
  }

  async function insertTrainingPack() {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes?.user?.email || 'jessiecrider3@gmail.com';
      const rows = [
        {
          user_email: email,
          title: 'Android Build Playbook (Capacitor/Vite React)',
          content: `Goal: Produce an Android APK/AAB from the CriderGPT web app using Capacitor.\n\n1) git clone https://github.com/1995F150/cridergpt.git && cd cridergpt\n2) npm install\n3) npm run build\n4) npx cap add android (first time only)\n5) npx cap sync android\n6) npx cap open android\n7) Android Studio: Build > Build APK(s) → android/app/build/outputs/apk/debug/app-debug.apk\n\nQuick update: npm run build && npx cap sync android\nTools: npx cap doctor, npm run lint, adb logcat`,
          tags: ['android','build','capacitor','mobile'],
          source: 'admin-ui'
        },
        {
          user_email: email,
          title: 'Web Dev & Deploy Playbook (Vite React)',
          content: `1) npm install\n2) npm run dev (local dev server)\n3) npm run build (production)\n4) npm run preview (serve dist)\n5) Deploy: upload dist/ to static hosting\nLint: npm run lint`,
          tags: ['web','vite','react','deploy'],
          source: 'admin-ui'
        },
        {
          user_email: email,
          title: 'PC Agent Action Dictionary (Open Websites & Apps)',
          content: `Open URL in default browser:\n- Windows (cmd): start https://example.com\n- PowerShell: Start-Process https://example.com\n- macOS: open https://example.com\n- Linux: xdg-open https://example.com\n\nOpen local file/folder:\n- Windows: start "" "C:\\path\\to\\file-or-folder"\n- macOS: open /path/to/file-or-folder\n- Linux: xdg-open /path/to/file-or-folder\n\nLaunch apps:\n- Windows: start notepad | start calc | start mspaint\n- macOS: open -a "Google Chrome" | open -a "Visual Studio Code"\n- Linux: code . | google-chrome https://example.com\n\nOpen GitHub repo quickly:\n- Windows: start https://github.com/1995F150/cridergpt\n- macOS: open https://github.com/1995F150/cridergpt\n- Linux: xdg-open https://github.com/1995F150/cridergpt`,
          tags: ['pc','agent','os','open','apps','urls'],
          source: 'admin-ui'
        }
      ];
      const { error } = await supabase.from('cridergpt_training_data').insert(rows);
      if (error) throw error;
      toast({ title: 'Training data added', description: 'Android/Web/PC knowledge inserted.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to insert training data', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> API Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Global Kill Switch</div>
              <div className="text-sm text-muted-foreground">Immediately disable all command execution</div>
            </div>
            <Switch checked={killSwitch} onCheckedChange={toggleKillSwitch} />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setGenOpen(true)} className="gap-2"><Key className="h-4 w-4" /> Generate API Key</Button>
            {plainKey && (
              <div className="text-sm">
                <span className="font-medium">New Key:</span> <span className="select-all">{plainKey}</span>
              </div>
            )}
            <Button variant="outline" onClick={insertTrainingPack} className="ml-auto">Add Training Booster</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Usage snapshot */}
          <div className="mb-4 text-sm text-muted-foreground">
            <span className="font-medium">Last 7 days usage:</span>{' '}
            {usage.length === 0 ? 'no data' :
              usage
                .slice()
                .sort((a,b)=>a.day.localeCompare(b.day))
                .slice(-7)
                .map(u => `${new Date(u.day).toLocaleDateString()}: ${u.endpoint} ${u.calls}`)
                .join('  |  ')
            }
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>{k.label || '—'}</TableCell>
                  <TableCell>{k.active ? <Badge>Active</Badge> : <Badge variant="destructive">Revoked</Badge>}</TableCell>
                  <TableCell>{k.rate_limit_per_minute || '—'}/min</TableCell>
                  <TableCell>{new Date(k.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" disabled={!k.active} onClick={() => revokeKey(k.id)}>Revoke</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> Keywords & Triggers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setKwModalOpen(true)}>Add Keyword</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map(kw => (
                <TableRow key={kw.id} className="cursor-pointer" onClick={() => { setKwData({ id: kw.id, keyword: kw.keyword, action_name: kw.action, description: kw.description || undefined, active: kw.active }); setKwModalOpen(true); }}>
                  <TableCell>{kw.keyword}</TableCell>
                  <TableCell>{kw.action}</TableCell>
                  <TableCell className="truncate max-w-[300px]">{kw.description}</TableCell>
                  <TableCell>{kw.active ? <Badge>Active</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Real-time API Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label>Email</Label>
              <Input placeholder="filter by email" value={logFilter.email} onChange={e => setLogFilter(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label>From</Label>
              <Input type="datetime-local" value={logFilter.from} onChange={e => setLogFilter(prev => ({ ...prev, from: e.target.value }))} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="datetime-local" value={logFilter.to} onChange={e => setLogFilter(prev => ({ ...prev, to: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button onClick={refreshLogs}>Apply Filters</Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Endpoint/Route</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                    <TableCell className="truncate max-w-[220px]">{l.user_email}</TableCell>
                    <TableCell className="truncate max-w-[180px]">{l.endpoint}</TableCell>
                    <TableCell className="truncate max-w-[420px]" title={l.command || ''}>{l.command}</TableCell>
                    <TableCell>{l.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generate Key Modal */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label (optional)</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g., PC Agent Key" />
            </div>
            <div>
              <Label>Permissions (JSON)</Label>
              <Textarea value={newPerms} onChange={e => setNewPerms(e.target.value)} rows={5} />
            </div>
            <div>
              <Label>Rate Limit (per minute)</Label>
              <Input type="number" value={newRate} onChange={e => setNewRate(parseInt(e.target.value || '0'))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generateKey}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Modal */}
      <Dialog open={kwModalOpen} onOpenChange={setKwModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kwData.id ? 'Edit Keyword' : 'Add Keyword'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Keyword</Label>
              <Input value={kwData.keyword} onChange={e => setKwData(prev => ({ ...prev, keyword: e.target.value }))} />
            </div>
            <div>
              <Label>Action</Label>
              <Input placeholder="e.g., agent_mode" value={kwData.action_name} onChange={e => setKwData(prev => ({ ...prev, action_name: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={kwData.description || ''} onChange={e => setKwData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={kwData.active ?? true} onCheckedChange={(v) => setKwData(prev => ({ ...prev, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKwModalOpen(false)}>Cancel</Button>
            <Button onClick={saveKeyword}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
