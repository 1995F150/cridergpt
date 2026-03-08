import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, Play, Plus, Trash2, ArrowUp, Eye, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LearningItem {
  id: string;
  topic: string;
  gap_description: string | null;
  priority: number;
  status: string;
  source: string;
  learned_data: string | null;
  detected_from: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function LearningDashboard() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [manualTopic, setManualTopic] = useState('');
  const [viewItem, setViewItem] = useState<LearningItem | null>(null);
  const [stats, setStats] = useState({ pending: 0, learned: 0, dismissed: 0, processing: 0 });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('learning_queue')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching learning queue:', error);
    } else {
      setItems(data || []);
      const all = data || [];
      setStats({
        pending: all.filter((i: LearningItem) => i.status === 'pending').length,
        learned: all.filter((i: LearningItem) => i.status === 'learned').length,
        dismissed: all.filter((i: LearningItem) => i.status === 'dismissed').length,
        processing: all.filter((i: LearningItem) => i.status === 'processing').length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const runLearningCycle = async () => {
    setRunningCycle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('self-learn', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (res.error) throw res.error;
      toast({ title: 'Learning Cycle Complete', description: `Processed ${res.data?.processed || 0} items, ${res.data?.failed || 0} failed.` });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setRunningCycle(false);
  };

  const addManualGap = async () => {
    if (!manualTopic.trim()) return;
    const { error } = await (supabase as any).from('learning_queue').insert({
      topic: manualTopic.trim(),
      gap_description: 'Manually added by admin',
      source: 'manual',
      priority: 3,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setManualTopic('');
      toast({ title: 'Gap Added', description: 'Topic added to learning queue.' });
      fetchItems();
    }
  };

  const dismissItem = async (id: string) => {
    await (supabase as any).from('learning_queue').update({ status: 'dismissed', resolved_at: new Date().toISOString() }).eq('id', id);
    fetchItems();
  };

  const prioritizeItem = async (id: string) => {
    await (supabase as any).from('learning_queue').update({ priority: 1 }).eq('id', id);
    fetchItems();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'learned': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'dismissed': return 'bg-muted text-muted-foreground border-muted';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'Processing', value: stats.processing, color: 'text-blue-400' },
          { label: 'Learned', value: stats.learned, color: 'text-emerald-400' },
          { label: 'Dismissed', value: stats.dismissed, color: 'text-muted-foreground' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            Self-Learning Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={runLearningCycle} disabled={runningCycle || stats.pending === 0} className="gap-2">
              {runningCycle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Learning Cycle ({stats.pending} pending)
            </Button>
            <Button variant="outline" onClick={fetchItems} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a topic to learn about..."
              value={manualTopic}
              onChange={(e) => setManualTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManualGap()}
            />
            <Button onClick={addManualGap} disabled={!manualTopic.trim()} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Add Gap
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No items in the learning queue yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[300px] truncate font-medium">{item.topic}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.source}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {item.learned_data && (
                            <Button size="icon" variant="ghost" onClick={() => setViewItem(item)} title="View learned data">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {item.status === 'pending' && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => prioritizeItem(item.id)} title="Prioritize">
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => dismissItem(item.id)} title="Dismiss">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Learned Data: {viewItem?.topic}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {viewItem?.gap_description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gap Description</p>
                <p className="text-sm">{viewItem.gap_description}</p>
              </div>
            )}
            {viewItem?.detected_from && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Detected From</p>
                <p className="text-sm bg-muted p-2 rounded">{viewItem.detected_from}</p>
              </div>
            )}
            {viewItem?.learned_data && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learned Data</p>
                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">{viewItem.learned_data}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
