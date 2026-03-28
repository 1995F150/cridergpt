import { useState, useEffect } from 'react';
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
import { Plus, Edit, Trash2, DollarSign, Package, ShieldCheck, Lightbulb } from 'lucide-react';
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

const CATEGORY_OPTIONS = ['general', 'livestock', 'electronics', 'accessories', 'software'];

const defaultForm = {
  title: '', description: '', category: 'general', status: 'idea',
  materials: [] as Material[], est_cost: '', sell_price: '',
  notes: '', is_patented: false, is_public: false,
};

export function ProductIdeasTracker() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<ProductIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [newMaterial, setNewMaterial] = useState({ name: '', cost: '' });
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const filteredIdeas = filterStatus === 'all' ? ideas : ideas.filter(i => i.status === filterStatus);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Product Ideas</h2>
          <Badge variant="secondary">{ideas.length} total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
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
                        {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
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
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Est. Cost ($)</Label><Input type="number" value={form.est_cost} onChange={e => setForm(f => ({ ...f, est_cost: e.target.value }))} /></div>
                  <div><Label>Sell Price ($)</Label><Input type="number" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} /></div>
                </div>
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
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No product ideas yet. Click "Add Idea" to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map(idea => (
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
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">{idea.category}</Badge>
                  {idea.est_cost && <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Cost: ${idea.est_cost}</span>}
                  {idea.sell_price && <span className="text-green-600 flex items-center gap-1"><DollarSign className="h-3 w-3" />Sell: ${idea.sell_price}</span>}
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
