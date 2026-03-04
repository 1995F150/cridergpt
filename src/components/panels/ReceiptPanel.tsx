import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Upload, Trash2, DollarSign, TrendingUp, Calendar, Tag, Plus, X, Image as ImageIcon } from 'lucide-react';

interface ReceiptRecord {
  id: string;
  store_name: string;
  amount: number;
  category: string;
  receipt_date: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

const CATEGORIES = [
  'general', 'groceries', 'fuel', 'farm-supplies', 'equipment',
  'feed', 'veterinary', 'repairs', 'clothing', 'food',
  'entertainment', 'utilities', 'insurance', 'other'
];

export function ReceiptPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [storeName, setStoreName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('receipt_date', { ascending: false });

    if (!error && data) setReceipts(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !storeName || !amount) return;

    setUploading(true);
    let imageUrl: string | null = null;

    try {
      // Upload image if provided
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, imageFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const { error } = await (supabase as any).from('receipts').insert({
        user_id: user.id,
        store_name: storeName,
        amount: parseFloat(amount),
        category,
        receipt_date: receiptDate,
        notes: notes || null,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({ title: 'Receipt saved', description: `$${parseFloat(amount).toFixed(2)} at ${storeName}` });
      // Reset form
      setStoreName(''); setAmount(''); setCategory('general'); setNotes('');
      setImageFile(null); setImagePreview(null); setShowForm(false);
      setReceiptDate(new Date().toISOString().split('T')[0]);
      fetchReceipts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('receipts').delete().eq('id', id);
    if (!error) {
      setReceipts(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Deleted', description: 'Receipt removed' });
    }
  };

  const filtered = filterCategory === 'all' ? receipts : receipts.filter(r => r.category === filterCategory);
  const totalSpent = filtered.reduce((sum, r) => sum + Number(r.amount), 0);
  const thisMonth = filtered
    .filter(r => {
      const d = new Date(r.receipt_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + Number(r.amount), 0);

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Sign in to track your receipts and spending.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">${totalSpent.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">${thisMonth.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receipts</p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Receipt'}
        </Button>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add Receipt Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">New Receipt</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Walmart, Tractor Supply..." required />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Receipt Photo</Label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">{imageFile ? imageFile.name : 'Upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border" />
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={uploading} className="w-full">
                  {uploading ? 'Saving...' : 'Save Receipt'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receipt List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading receipts...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No receipts yet. Tap "Add Receipt" to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                {r.image_url ? (
                  <img src={r.image_url} alt="Receipt" className="h-14 w-14 object-cover rounded-lg border flex-shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{r.store_name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{r.category.replace('-', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.receipt_date).toLocaleDateString()}</span>
                    {r.notes && <span className="truncate">{r.notes}</span>}
                  </div>
                </div>
                <p className="text-lg font-bold text-primary whitespace-nowrap">${Number(r.amount).toFixed(2)}</p>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="flex-shrink-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
