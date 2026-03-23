import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, DollarSign, Eye, CheckCircle2, Clock, Truck, XCircle, Link2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface FilterOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_snapchat: string | null;
  customer_phone: string | null;
  filter_type: string;
  description: string;
  price_range_min: number;
  price_range_max: number;
  agreed_price: number | null;
  payment_method: string | null;
  payment_status: string;
  status: string;
  admin_notes: string | null;
  delivery_url: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ['new', 'quoted', 'accepted', 'in_progress', 'review', 'delivered', 'completed', 'cancelled'];
const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'refunded'];

const statusConfig: Record<string, { color: string; icon: any }> = {
  new: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
  quoted: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: DollarSign },
  accepted: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  in_progress: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Package },
  review: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Eye },
  delivered: { color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: Truck },
  completed: { color: 'bg-green-600/10 text-green-600 border-green-600/20', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
};

const filterTypeLabels: Record<string, string> = {
  basic_glow: 'Basic Glow ($3-$5)',
  animated_chrome: 'Animated/Chrome ($7-$12)',
  full_custom: 'Full Custom ($15-$25)',
};

export function FilterOrdersManager() {
  const [orders, setOrders] = useState<FilterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { status: string; payment_status: string; agreed_price: string; admin_notes: string; delivery_url: string }>>({});

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('filter_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdate = async (id: string) => {
    const edit = editData[id];
    if (!edit) return;

    const { error } = await (supabase as any)
      .from('filter_orders')
      .update({
        status: edit.status,
        payment_status: edit.payment_status,
        agreed_price: edit.agreed_price ? parseFloat(edit.agreed_price) : null,
        admin_notes: edit.admin_notes || null,
        delivery_url: edit.delivery_url || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order');
    } else {
      toast.success('Order updated');
      fetchOrders();
    }
  };

  const initEdit = (order: FilterOrder) => {
    setEditData(prev => ({
      ...prev,
      [order.id]: {
        status: order.status,
        payment_status: order.payment_status,
        agreed_price: order.agreed_price?.toString() || '',
        admin_notes: order.admin_notes || '',
        delivery_url: order.delivery_url || '',
      }
    }));
    setExpandedId(expandedId === order.id ? null : order.id);
  };

  const newCount = orders.filter(o => o.status === 'new').length;
  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const revenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.agreed_price || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Filter Orders</h2>
          <p className="text-sm text-muted-foreground">Manage custom Snapchat filter requests</p>
        </div>
        <div className="flex gap-2">
          {newCount > 0 && <Badge variant="destructive">{newCount} New</Badge>}
          <Badge variant="outline">{activeCount} Active</Badge>
          <Badge variant="secondary">${revenue} Earned</Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet. Share your /custom-filters page to start getting requests!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = statusConfig[order.status] || statusConfig.new;
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === order.id;
            const edit = editData[order.id];

            return (
              <Card key={order.id} className={`transition-all ${order.status === 'new' ? 'border-primary/30' : ''}`}>
                <CardContent className="p-4">
                  {/* Summary Row */}
                  <button onClick={() => initEdit(order)} className="w-full text-left flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {filterTypeLabels[order.filter_type] || order.filter_type} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${cfg.color}`}>{order.status}</Badge>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {order.payment_status}
                      </Badge>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && edit && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Customer Info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{order.customer_email}</span></div>
                        {order.customer_snapchat && <div><span className="text-muted-foreground">Snap:</span> <span className="font-medium">{order.customer_snapchat}</span></div>}
                        {order.customer_phone && <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{order.customer_phone}</span></div>}
                        <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{order.payment_method || 'Not selected'}</span></div>
                      </div>

                      {/* Description */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Customer Request:</p>
                        <p className="text-sm">{order.description}</p>
                      </div>

                      {/* Edit Fields */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Status</label>
                          <Select value={edit.status} onValueChange={v => setEditData(p => ({ ...p, [order.id]: { ...p[order.id], status: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Payment Status</label>
                          <Select value={edit.payment_status} onValueChange={v => setEditData(p => ({ ...p, [order.id]: { ...p[order.id], payment_status: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Agreed Price ($)</label>
                          <Input type="number" placeholder={`${order.price_range_min}-${order.price_range_max}`} value={edit.agreed_price} onChange={e => setEditData(p => ({ ...p, [order.id]: { ...p[order.id], agreed_price: e.target.value } }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Delivery URL</label>
                          <Input placeholder="Link to delivered filter" value={edit.delivery_url} onChange={e => setEditData(p => ({ ...p, [order.id]: { ...p[order.id], delivery_url: e.target.value } }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Admin Notes</label>
                        <Textarea rows={2} placeholder="Internal notes..." value={edit.admin_notes} onChange={e => setEditData(p => ({ ...p, [order.id]: { ...p[order.id], admin_notes: e.target.value } }))} />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleUpdate(order.id)} size="sm">Save Changes</Button>
                        {edit.agreed_price && parseFloat(edit.agreed_price) > 0 && order.payment_status !== 'paid' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1.5"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.functions.invoke('filter-checkout', {
                                  body: {
                                    order_id: order.id,
                                    amount: parseFloat(edit.agreed_price),
                                    customer_email: order.customer_email,
                                    customer_name: order.customer_name,
                                    filter_type: order.filter_type,
                                    mode: 'payment_link',
                                  },
                                });
                                if (error) throw error;
                                if (data?.url) {
                                  await navigator.clipboard.writeText(data.url);
                                  toast.success('Payment link copied! Send it to the customer.');
                                }
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to generate link');
                              }
                            }}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Generate Payment Link (${edit.agreed_price})
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
