import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Loader2, RefreshCw, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Throttle {
  id: string;
  feature_key: string;
  enabled: boolean;
  retention_days: number;
  description: string | null;
  updated_at: string;
}

const FRIENDLY_LABELS: Record<string, string> = {
  ai_memory_writes: 'AI Memory Writes',
  vision_memory_writes: 'Vision Memory Writes',
  chat_history_persist: 'Chat History Persistence',
  media_generations_persist: 'Media Generation Records',
  ai_interactions_log: 'AI Interactions Log',
  ai_feedback_log: 'AI Feedback Log',
  scan_logs: 'Livestock Scan Logs',
  agent_swarm_logs: 'Agent Swarm Task Logs',
};

export function DatabaseThrottlePanel() {
  const [throttles, setThrottles] = useState<Throttle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);

  const fetchThrottles = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('feature_throttles')
      .select('*')
      .order('feature_key');
    if (error) toast.error('Failed to load throttle settings');
    else setThrottles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchThrottles(); }, []);

  const updateThrottle = async (id: string, patch: Partial<Throttle>) => {
    setSaving(id);
    const { error } = await (supabase as any)
      .from('feature_throttles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(`Save failed: ${error.message}`);
    else {
      setThrottles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
      toast.success('Saved');
    }
    setSaving(null);
  };

  const runAutoprune = async () => {
    setPruning(true);
    const { data, error } = await (supabase as any).rpc('run_data_autoprune');
    setPruning(false);
    if (error) { toast.error(`Prune failed: ${error.message}`); return; }
    const total = Object.values(data || {}).reduce((a: number, b: any) => a + (b || 0), 0);
    toast.success(`Pruned ${total} rows across ${Object.keys(data || {}).length} tables`);
    console.log('Autoprune result:', data);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-destructive/10 via-amber-500/5 to-destructive/10 border-destructive/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-destructive to-amber-600 flex items-center justify-center shadow-lg">
              <Database className="h-6 w-6 text-destructive-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Database Throttle &amp; Auto-Prune</h2>
              <p className="text-muted-foreground text-sm">Slow data growth and recycle old rows to extend backend lifespan.</p>
            </div>
            <Button onClick={runAutoprune} disabled={pruning} variant="destructive" className="gap-2">
              {pruning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Run Prune Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium">One-time space reclaim required</p>
            <p className="text-muted-foreground">
              The auto-prune deletes rows but Postgres keeps reserved space until <code className="bg-muted px-1 rounded">VACUUM FULL</code> runs.
              Run this once in the Supabase SQL Editor to instantly reclaim ~700&nbsp;MB:
            </p>
            <pre className="bg-muted/70 p-2 rounded text-xs mt-1 overflow-x-auto">VACUUM (FULL, ANALYZE) public.vision_memory;
VACUUM (FULL, ANALYZE) public.ai_memory;
VACUUM (FULL, ANALYZE) public.chat_messages;
VACUUM (FULL, ANALYZE) public.media_generations;</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Feature Kill Switches &amp; Retention</span>
            <Button variant="ghost" size="sm" onClick={fetchThrottles} className="gap-1.5 text-xs">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : throttles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-6">No throttle entries.</p>
          ) : throttles.map(t => (
            <div key={t.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{FRIENDLY_LABELS[t.feature_key] || t.feature_key}</p>
                    <Badge variant={t.enabled ? 'default' : 'destructive'} className="text-[10px]">
                      {t.enabled ? 'ENABLED' : 'OFF'}
                    </Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  <p className="text-[10px] text-muted-foreground font-mono">{t.feature_key}</p>
                </div>
                <Switch
                  checked={t.enabled}
                  disabled={saving === t.id}
                  onCheckedChange={(v) => updateThrottle(t.id, { enabled: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Keep rows for</label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={t.retention_days}
                  disabled={saving === t.id}
                  onChange={(e) => setThrottles(prev => prev.map(x => x.id === t.id ? { ...x, retention_days: parseInt(e.target.value) || 1 } : x))}
                  onBlur={(e) => updateThrottle(t.id, { retention_days: parseInt(e.target.value) || 1 })}
                  className="w-24 h-8"
                />
                <span className="text-xs text-muted-foreground">days · auto-pruned daily at 03:30 UTC</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
