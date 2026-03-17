import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Ghost, Eye, Play, Share2, Plus, Trash2, Globe, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LensAnalytics {
  id: string;
  lens_name: string;
  snapshot_date: string;
  total_views: number;
  total_plays: number;
  total_shares: number;
  top_countries: Array<{ country: string; percentage: number }>;
  top_interests: string[];
  notes: string | null;
  created_at: string;
}

export function SnapchatAnalytics() {
  const [entries, setEntries] = useState<LensAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lens_name: '',
    total_views: 0,
    total_plays: 0,
    total_shares: 0,
    top_countries: '',
    top_interests: '',
    notes: '',
  });

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('snapchat_lens_analytics')
      .select('*')
      .order('snapshot_date', { ascending: false });

    if (!error && data) setEntries(data);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSubmit = async () => {
    if (!form.lens_name.trim()) {
      toast.error('Lens name is required');
      return;
    }

    setSaving(true);
    try {
      // Parse countries: "US:75.57, Canada:4.72"
      const countries = form.top_countries
        .split(',')
        .map(c => c.trim())
        .filter(Boolean)
        .map(c => {
          const [country, pct] = c.split(':');
          return { country: country?.trim() || '', percentage: parseFloat(pct) || 0 };
        });

      const interests = form.top_interests
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

      const { error } = await (supabase as any)
        .from('snapchat_lens_analytics')
        .insert({
          lens_name: form.lens_name,
          total_views: form.total_views,
          total_plays: form.total_plays,
          total_shares: form.total_shares,
          top_countries: countries,
          top_interests: interests,
          notes: form.notes || null,
        });

      if (error) throw error;

      toast.success('Lens analytics snapshot saved');
      setShowForm(false);
      setForm({ lens_name: '', total_views: 0, total_plays: 0, total_shares: 0, top_countries: '', top_interests: '', notes: '' });
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('snapchat_lens_analytics')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Entry deleted');
      fetchEntries();
    } else {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ghost className="h-6 w-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold">Snapchat Lens Analytics</h2>
            <p className="text-sm text-muted-foreground">Track filter performance to inform AI promotion strategies</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Snapshot
        </Button>
      </div>

      {showForm && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-base">Add Analytics Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Lens name (e.g., Vibe Check Bot)"
              value={form.lens_name}
              onChange={e => setForm(f => ({ ...f, lens_name: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Views</label>
                <Input type="number" value={form.total_views} onChange={e => setForm(f => ({ ...f, total_views: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Plays</label>
                <Input type="number" value={form.total_plays} onChange={e => setForm(f => ({ ...f, total_plays: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Shares</label>
                <Input type="number" value={form.total_shares} onChange={e => setForm(f => ({ ...f, total_shares: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Top Countries (format: US:75.57, Canada:4.72)</label>
              <Input
                placeholder="United States:75.57, Canada:4.72, UK:0.71"
                value={form.top_countries}
                onChange={e => setForm(f => ({ ...f, top_countries: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Top Interests (comma-separated)</label>
              <Input
                placeholder="Gamers, Sports Fans, Music Fans"
                value={form.top_interests}
                onChange={e => setForm(f => ({ ...f, top_interests: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Snapshot
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No lens analytics data yet. Add your first snapshot above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ghost className="h-5 w-5 text-yellow-500" />
                    <CardTitle className="text-base">{entry.lens_name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{entry.snapshot_date}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-bold">{entry.total_views.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Play className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Plays</p>
                      <p className="font-bold">{entry.total_plays.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Share2 className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Shares</p>
                      <p className="font-bold">{entry.total_shares.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Countries */}
                {Array.isArray(entry.top_countries) && entry.top_countries.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Top Countries
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.top_countries.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {c.country} ({c.percentage}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {Array.isArray(entry.top_interests) && entry.top_interests.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Top Interests
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.top_interests.map((interest, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{entry.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
