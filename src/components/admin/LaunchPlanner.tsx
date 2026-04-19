import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Rocket, Target, TrendingUp, BarChart3, RefreshCw, Tag, Users, Building2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface PlannerTask {
  id: string;
  phase: string;
  phase_order: number;
  task_order: number;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

interface Metrics {
  tagsAvailable: number;
  tagsAssigned: number;
  leads: number;
  sales: number;
  chapters: number;
}

const PHASE_ICONS: Record<string, any> = {
  'Pre-Launch': Rocket,
  'Soft Launch': Target,
  'Scale': TrendingUp,
  'Track & Iterate': BarChart3,
};

export function LaunchPlanner() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tasksRes, tagsAvail, tagsAssigned, leads, sales, chapters] = await Promise.all([
        (supabase as any).from('launch_planner_tasks').select('*').order('phase_order').order('task_order'),
        supabase.from('livestock_tag_pool').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('livestock_tag_pool').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
        supabase.from('farmbureau_leads').select('*', { count: 'exact', head: true }),
        supabase.from('iap_purchases').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
      ]);
      if (tasksRes.error) throw tasksRes.error;
      setTasks(tasksRes.data || []);
      setMetrics({
        tagsAvailable: tagsAvail.count || 0,
        tagsAssigned: tagsAssigned.count || 0,
        leads: leads.count || 0,
        sales: sales.count || 0,
        chapters: chapters.count || 0,
      });
    } catch (e: any) {
      toast.error('Failed to load planner', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleTask = async (task: PlannerTask) => {
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t));
    const { error } = await (supabase as any)
      .from('launch_planner_tasks')
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq('id', task.id);
    if (error) {
      toast.error('Update failed', { description: error.message });
      loadAll();
    } else if (newCompleted) {
      toast.success(`✅ ${task.title}`);
    }
  };

  const saveNotes = async (taskId: string) => {
    const notes = editingNotes[taskId] ?? '';
    const { error } = await (supabase as any).from('launch_planner_tasks').update({ notes }).eq('id', taskId);
    if (error) return toast.error('Failed to save notes');
    toast.success('Notes saved');
    setEditingNotes(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes } : t));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalDone = tasks.filter(t => t.completed).length;
  const totalProgress = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;

  // Group by phase
  const phases = Array.from(new Set(tasks.map(t => t.phase))).map(phaseName => ({
    name: phaseName,
    order: tasks.find(t => t.phase === phaseName)!.phase_order,
    tasks: tasks.filter(t => t.phase === phaseName),
  })).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Smart Tag Launch Planner
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your roadmap from 0 sales to selling out. Check things off as you go.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Live Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard icon={Tag} label="Tags Ready" value={metrics.tagsAvailable} accent={metrics.tagsAvailable < 50 ? 'destructive' : 'default'} />
          <MetricCard icon={Tag} label="Tags Sold" value={metrics.tagsAssigned} />
          <MetricCard icon={Users} label="Leads" value={metrics.leads} />
          <MetricCard icon={ShoppingCart} label="Orders" value={metrics.sales} />
          <MetricCard icon={Building2} label="Chapters" value={metrics.chapters} accent="success" />
        </div>
      )}

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{totalDone} of {tasks.length} tasks ({totalProgress}%)</span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Phases */}
      {phases.map(phase => {
        const Icon = PHASE_ICONS[phase.name] ?? Rocket;
        const done = phase.tasks.filter(t => t.completed).length;
        const pct = Math.round((done / phase.tasks.length) * 100);
        return (
          <Card key={phase.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  Phase {phase.order}: {phase.name}
                </CardTitle>
                <Badge variant={pct === 100 ? 'default' : 'secondary'}>{done}/{phase.tasks.length}</Badge>
              </div>
              <Progress value={pct} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {phase.tasks.map(task => (
                <div key={task.id} className={`p-3 rounded-lg border transition-colors ${task.completed ? 'bg-muted/30 border-muted' : 'bg-background border-border hover:border-primary/30'}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>
                      )}
                      {task.completed_at && (
                        <div className="text-xs text-primary mt-1">
                          ✓ Done {new Date(task.completed_at).toLocaleDateString()}
                        </div>
                      )}

                      {/* Notes */}
                      {editingNotes[task.id] !== undefined ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editingNotes[task.id]}
                            onChange={e => setEditingNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Notes, links, results..."
                            className="text-xs min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveNotes(task.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNotes(prev => { const n = { ...prev }; delete n[task.id]; return n; })}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          {task.notes && <div className="text-xs italic text-muted-foreground bg-muted/40 p-2 rounded mb-1">{task.notes}</div>}
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingNotes(prev => ({ ...prev, [task.id]: task.notes ?? '' }))}>
                            {task.notes ? 'Edit notes' : '+ Add notes'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: 'default' | 'destructive' | 'success' }) {
  const colorClass = accent === 'destructive' ? 'text-destructive' : accent === 'success' ? 'text-green-600 dark:text-green-400' : 'text-primary';
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
