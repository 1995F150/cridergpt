import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface StoreProduct {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_digital: boolean;
  stripe_price_id: string | null;
  created_at: string;
}

const CATEGORIES = ['smart-id', 'accessories', 'equipment', 'digital', 'bundles'];

const defaultForm = {
  title: '', description: '', category: 'smart-id', price: '', compare_at_price: '',
  image_url: '', stock_quantity: '0', is_active: true, is_digital: false, stripe_price_id: '',
};

export function StoreProductsManager() {
  const { user } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchProducts = async () => {
    const { data, error } = await (supabase as any)
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return toast({ title: 'Title required', variant: 'destructive' });
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      price: parseFloat(form.price) || 0,
      compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
      image_url: form.image_url || null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      is_active: form.is_active,
      is_digital: form.is_digital,
      stripe_price_id: form.stripe_price_id || null,
    };

    if (editingId) {
      const { error } = await (supabase as any).from('store_products').update(payload).eq('id', editingId);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      toast({ title: 'Product updated' });
    } else {
      const { error } = await (supabase as any).from('store_products').insert({ ...payload, created_by: user?.id });
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      toast({ title: 'Product added' });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('store_products').delete().eq('id', id);
    if (!error) { fetchProducts(); toast({ title: 'Deleted' }); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from('store_products').update({ is_active: !current }).eq('id', id);
    fetchProducts();
  };

  const openEdit = (p: StoreProduct) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description || '',
      category: p.category,
      price: p.price.toString(),
      compare_at_price: p.compare_at_price?.toString() || '',
      image_url: p.image_url || '',
      stock_quantity: p.stock_quantity.toString(),
      is_active: p.is_active,
      is_digital: p.is_digital,
      stripe_price_id: p.stripe_price_id || '',
    });
    setDialogOpen(true);
  };

  const totalStock = products.reduce((s, p) => s + p.stock_quantity, 0);
  const activeCount = products.filter(p => p.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Store Products</h2>
          <Badge variant="secondary">{products.length} products</Badge>
          <Badge variant="outline">{activeCount} active</Badge>
          <Badge variant="outline" className="text-muted-foreground">{totalStock} total stock</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'New'} Product</DialogTitle>
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
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stock Qty</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div><Label>Compare-at Price ($)</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={e => setForm(f => ({ ...f, compare_at_price: e.target.value }))} placeholder="Optional" /></div>
              </div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
              <div><Label>Stripe Price ID</Label><Input value={form.stripe_price_id} onChange={e => setForm(f => ({ ...f, stripe_price_id: e.target.value }))} placeholder="price_xxx" /></div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_digital} onCheckedChange={v => setForm(f => ({ ...f, is_digital: v }))} /><Label>Digital Product</Label></div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editingId ? 'Update' : 'Create'} Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
      ) : products.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No store products yet.</CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div>
                        <p className="font-medium text-sm">{p.title}</p>
                        {p.is_digital && <Badge variant="outline" className="text-[10px]">Digital</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">${p.price.toFixed(2)}</span>
                    {p.compare_at_price && <span className="text-xs text-muted-foreground line-through ml-1">${p.compare_at_price.toFixed(2)}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={p.stock_quantity <= 0 ? 'text-destructive font-medium' : ''}>{p.stock_quantity}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(p.id, p.is_active)}>
                      {p.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
