import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, DollarSign, Package, ShieldCheck, Lightbulb, TrendingUp, ArrowUpDown, Star, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Material {
  name: string;
  cost: number;
  bought: boolean;
}

interface ProductIdea {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  materials: Material[];
  est_cost: number | null;
  sell_price: number | null;
  production_quantity: number;
  notes: string | null;
  is_patented: boolean;
  is_public: boolean;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'researching', label: 'Researching', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'materials_bought', label: 'Materials Bought', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'prototyping', label: 'Prototyping', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'built', label: 'Built', color: 'bg-green-500/10 text-green-600' },
  { value: 'selling', label: 'Selling', color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'shelved', label: 'Shelved', color: 'bg-muted text-muted-foreground' },
];

const CATEGORY_OPTIONS = ['general', 'livestock', 'electronics', 'accessories', 'software', 'woodworking', 'metalwork', '3d-printing', 'home-garden'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest_profit', label: 'Highest Profit/Unit' },
  { value: 'lowest_cost', label: 'Lowest Cost/Unit' },
  { value: 'highest_total_profit', label: 'Highest Total Profit' },
  { value: 'lowest_production_cost', label: 'Lowest Production Cost' },
  { value: 'highest_roi', label: 'Highest ROI' },
];

const defaultForm = {
  title: '', description: '', category: 'general', status: 'idea',
  materials: [] as Material[], est_cost: '', sell_price: '', production_quantity: '100',
  notes: '', is_patented: false, is_public: false,
};

function calcProfit(cost: number | null, sell: number | null) {
  if (cost == null || sell == null) return null;
  return sell - cost;
}
function calcROI(cost: number | null, sell: number | null) {
  if (cost == null || sell == null || cost === 0) return null;
  return ((sell - cost) / cost) * 100;
}

function getInsightBadge(idea: ProductIdea) {
  const profit = calcProfit(idea.est_cost, idea.sell_price);
  const roi = calcROI(idea.est_cost, idea.sell_price);
  const badges: { label: string; color: string }[] = [];
  if (profit != null && profit >= 5) badges.push({ label: 'High Profit', color: 'bg-green-500/10 text-green-700' });
  if (idea.est_cost != null && idea.est_cost <= 2) badges.push({ label: 'Low Cost', color: 'bg-blue-500/10 text-blue-700' });
  if (idea.est_cost != null && idea.est_cost <= 5 && profit != null && profit > 0) badges.push({ label: 'Best Starter', color: 'bg-amber-500/10 text-amber-700' });
  if (idea.est_cost != null && idea.est_cost > 10) badges.push({ label: 'High Investment', color: 'bg-red-500/10 text-red-700' });
  return badges;
}

export function ProductIdeasTracker() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<ProductIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [newMaterial, setNewMaterial] = useState({ name: '', cost: '' });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [topPicks, setTopPicks] = useState(false);

  const fetchIdeas = async () => {
    const { data, error } = await (supabase as any)
      .from('product_ideas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setIdeas(data);
    setLoading(false);
  };

  useEffect(() => { fetchIdeas(); }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return toast({ title: 'Title required', variant: 'destructive' });
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      status: form.status,
      materials: form.materials,
      est_cost: form.est_cost ? parseFloat(form.est_cost) : null,
      sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
      production_quantity: parseInt(form.production_quantity) || 100,
      notes: form.notes || null,
      is_patented: form.is_patented,
      is_public: form.is_public,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await (supabase as any).from('product_ideas').update(payload).eq('id', editingId);
      if (error) return toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      toast({ title: 'Product idea updated' });
    } else {
      const { error } = await (supabase as any).from('product_ideas').insert({ ...payload, created_by: user?.id });
      if (error) return toast({ title: 'Error creating', description: error.message, variant: 'destructive' });
      toast({ title: 'Product idea added' });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    fetchIdeas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('product_ideas').delete().eq('id', id);
    if (!error) { fetchIdeas(); toast({ title: 'Deleted' }); }
  };

  const openEdit = (idea: ProductIdea) => {
    setEditingId(idea.id);
    setForm({
      title: idea.title,
      description: idea.description || '',
      category: idea.category,
      status: idea.status,
      materials: idea.materials || [],
      est_cost: idea.est_cost?.toString() || '',
      sell_price: idea.sell_price?.toString() || '',
      production_quantity: idea.production_quantity?.toString() || '100',
      notes: idea.notes || '',
      is_patented: idea.is_patented,
      is_public: idea.is_public,
    });
    setDialogOpen(true);
  };

  const addMaterial = () => {
    if (!newMaterial.name.trim()) return;
    setForm(f => ({
      ...f,
      materials: [...f.materials, { name: newMaterial.name, cost: parseFloat(newMaterial.cost) || 0, bought: false }]
    }));
    setNewMaterial({ name: '', cost: '' });
  };

  const toggleMaterialBought = (idx: number) => {
    setForm(f => ({
      ...f,
      materials: f.materials.map((m, i) => i === idx ? { ...m, bought: !m.bought } : m)
    }));
  };

  const removeMaterial = (idx: number) => {
    setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));
  };

  const materialsCost = (materials: Material[]) => materials.reduce((s, m) => s + (m.cost || 0), 0);
  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={opt?.color || ''}>{opt?.label || status}</Badge>;
  };

  const processedIdeas = useMemo(() => {
    let list = [...ideas];

    // Filters
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(i => i.category === filterCategory);

    // Sort
    list.sort((a, b) => {
      const profitA = calcProfit(a.est_cost, a.sell_price) ?? -Infinity;
      const profitB = calcProfit(b.est_cost, b.sell_price) ?? -Infinity;
      const totalProfitA = profitA !== -Infinity ? profitA * (a.production_quantity || 100) : -Infinity;
      const totalProfitB = profitB !== -Infinity ? profitB * (b.production_quantity || 100) : -Infinity;
      switch (sortBy) {
        case 'highest_profit': return profitB - profitA;
        case 'lowest_cost': return (a.est_cost ?? Infinity) - (b.est_cost ?? Infinity);
        case 'highest_total_profit': return totalProfitB - totalProfitA;
        case 'lowest_production_cost':
          return ((a.est_cost ?? Infinity) * (a.production_quantity || 100)) - ((b.est_cost ?? Infinity) * (b.production_quantity || 100));
        case 'highest_roi':
          return (calcROI(b.est_cost, b.sell_price) ?? -Infinity) - (calcROI(a.est_cost, a.sell_price) ?? -Infinity);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Top picks
    if (topPicks) list = list.slice(0, 5);

    return list;
  }, [ideas, filterStatus, filterCategory, sortBy, topPicks]);

  // Summary stats
  const totalIdeas = ideas.length;
  const avgProfit = useMemo(() => {
    const profits = ideas.map(i => calcProfit(i.est_cost, i.sell_price)).filter((p): p is number => p != null);
    return profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
  }, [ideas]);

  const uniqueCategories = useMemo(() => [...new Set(ideas.map(i => i.category))], [ideas]);

  // Preview financials in form
  const formCost = parseFloat(form.est_cost) || 0;
  const formSell = parseFloat(form.sell_price) || 0;
  const formQty = parseInt(form.production_quantity) || 100;
  const formProfitUnit = formSell - formCost;
  const formTotalCost = formCost * formQty;
  const formTotalRevenue = formSell * formQty;
  const formTotalProfit = formTotalRevenue - formTotalCost;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Product Ideas</h2>
          <Badge variant="secondary">{totalIdeas} total</Badge>
          <Badge variant="outline" className="text-green-600">Avg Profit: ${avgProfit.toFixed(2)}/unit</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Idea</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'New'} Product Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Financial fields */}
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Cost (per unit)</Label><Input type="number" step="0.01" value={form.est_cost} onChange={e => setForm(f => ({ ...f, est_cost: e.target.value }))} placeholder="$0.00" /></div>
                <div><Label>Sale Price (per unit)</Label><Input type="number" step="0.01" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} placeholder="$0.00" /></div>
                <div><Label>Production Qty</Label><Input type="number" value={form.production_quantity} onChange={e => setForm(f => ({ ...f, production_quantity: e.target.value }))} /></div>
              </div>

              {/* Live financial preview */}
              {(formCost > 0 || formSell > 0) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-semibold text-xs text-muted-foreground mb-2">💰 Financial Preview</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span>Profit (per unit):</span>
                    <span className={formProfitUnit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>${formProfitUnit.toFixed(2)}</span>
                    <span>Total Production Cost:</span>
                    <span className="font-medium">${formTotalCost.toFixed(2)}</span>
                    <span>Total Revenue:</span>
                    <span className="font-medium">${formTotalRevenue.toFixed(2)}</span>
                    <span>Total Profit:</span>
                    <span className={formTotalProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>${formTotalProfit.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Materials */}
              <div>
                <Label>Materials</Label>
                <div className="space-y-1 mt-1">
                  {form.materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={m.bought} onCheckedChange={() => toggleMaterialBought(i)} />
                      <span className={m.bought ? 'line-through text-muted-foreground' : ''}>{m.name}</span>
                      <span className="text-muted-foreground ml-auto">${m.cost.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMaterial(i)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Material name" value={newMaterial.name} onChange={e => setNewMaterial(m => ({ ...m, name: e.target.value }))} className="flex-1" />
                  <Input placeholder="Cost" type="number" value={newMaterial.cost} onChange={e => setNewMaterial(m => ({ ...m, cost: e.target.value }))} className="w-20" />
                  <Button size="sm" variant="outline" onClick={addMaterial}>Add</Button>
                </div>
                {form.materials.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Total materials cost: ${materialsCost(form.materials).toFixed(2)}</p>
                )}
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_patented} onCheckedChange={v => setForm(f => ({ ...f, is_patented: v }))} />
                  <Label>Patented</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_public} onCheckedChange={v => setForm(f => ({ ...f, is_public: v }))} />
                  <Label>Public</Label>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editingId ? 'Update' : 'Create'} Idea</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Sort bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[170px]">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Star className={`h-4 w-4 ${topPicks ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <Label className="text-sm cursor-pointer" htmlFor="top-picks">Top 5 Picks</Label>
          <Switch id="top-picks" checked={topPicks} onCheckedChange={setTopPicks} />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{processedIdeas.length} product{processedIdeas.length !== 1 ? 's' : ''} shown</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : processedIdeas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No product ideas match your filters.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedIdeas.map(idea => {
            const profitUnit = calcProfit(idea.est_cost, idea.sell_price);
            const qty = idea.production_quantity || 100;
            const totalCost = idea.est_cost != null ? idea.est_cost * qty : null;
            const totalRevenue = idea.sell_price != null ? idea.sell_price * qty : null;
            const totalProfit = totalRevenue != null && totalCost != null ? totalRevenue - totalCost : null;
            const roi = calcROI(idea.est_cost, idea.sell_price);
            const insightBadges = getInsightBadge(idea);

            return (
              <Card key={idea.id} className="relative overflow-hidden">
                {idea.is_patented && (
                  <div className="absolute top-2 right-2"><ShieldCheck className="h-4 w-4 text-green-500" /></div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{idea.title}</CardTitle>
                    {getStatusBadge(idea.status)}
                  </div>
                  {idea.description && <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>}
                  {insightBadges.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {insightBadges.map((b, i) => (
                        <Badge key={i} className={`text-[10px] ${b.color}`}><Zap className="h-2.5 w-2.5 mr-0.5" />{b.label}</Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <Badge variant="outline">{idea.category}</Badge>
                    <span className="text-muted-foreground">Qty: {qty}</span>
                  </div>

                  {/* Financial breakdown */}
                  {(idea.est_cost != null || idea.sell_price != null) && (
                    <div className="bg-muted/40 rounded p-2 text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span>Cost (per unit):</span>
                        <span>${idea.est_cost?.toFixed(2) ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sale Price (per unit):</span>
                        <span className="text-green-600">${idea.sell_price?.toFixed(2) ?? '—'}</span>
                      </div>
                      {profitUnit != null && (
                        <div className="flex justify-between font-medium">
                          <span>Profit (per unit):</span>
                          <span className={profitUnit >= 0 ? 'text-green-600' : 'text-red-500'}>${profitUnit.toFixed(2)}</span>
                        </div>
                      )}
                      <hr className="border-border/50 my-1" />
                      {totalCost != null && (
                        <div className="flex justify-between">
                          <span>Total Production Cost:</span>
                          <span>${totalCost.toFixed(2)}</span>
                        </div>
                      )}
                      {totalRevenue != null && (
                        <div className="flex justify-between">
                          <span>Total Revenue:</span>
                          <span>${totalRevenue.toFixed(2)}</span>
                        </div>
                      )}
                      {totalProfit != null && (
                        <div className="flex justify-between font-bold">
                          <span>Total Profit:</span>
                          <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}>${totalProfit.toFixed(2)}</span>
                        </div>
                      )}
                      {roi != null && (
                        <div className="flex justify-between text-primary">
                          <span>ROI:</span>
                          <span>{roi.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {idea.materials && idea.materials.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Materials ({idea.materials.filter(m => m.bought).length}/{idea.materials.length} bought)</p>
                      <div className="space-y-0.5">
                        {idea.materials.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <Package className="h-3 w-3" />
                            <span className={m.bought ? 'line-through text-muted-foreground' : ''}>{m.name}</span>
                            <span className="ml-auto text-muted-foreground">${m.cost?.toFixed(2)}</span>
                          </div>
                        ))}
                        {idea.materials.length > 3 && <p className="text-xs text-muted-foreground">+{idea.materials.length - 3} more</p>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(idea)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(idea.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
