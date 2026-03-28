import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MapPin, Truck, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TagOrder {
  id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  shipping_address: any;
  notes: string | null;
  stripe_session_id: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  producing: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  shipped: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  delivered: 'bg-green-500/15 text-green-600 border-green-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function TagOrdersManager() {
  const [orders, setOrders] = useState<TagOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('tag_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading orders', description: error.message, variant: 'destructive' });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await (supabase as any)
      .from('tag_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const totalTagsNeeded = orders
    .filter(o => o.status === 'pending' || o.status === 'producing')
    .reduce((sum, o) => sum + o.quantity, 0);

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_price, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalTagsNeeded}</p>
          <p className="text-xs text-muted-foreground">Tags to Produce</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Orders</h3>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {orders.length === 0 && !loading && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet.</CardContent></Card>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const addr = order.shipping_address;
          const isPickup = addr?.method === 'local_pickup';

          return (
            <Card key={order.id} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{order.customer_name || order.customer_email}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={statusColors[order.status] || 'bg-muted text-foreground'}>
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><Package className="h-4 w-4 text-primary" /> <strong>{order.quantity}</strong> tags</span>
                  <span className="font-semibold text-primary">${order.total_price.toFixed(2)}</span>
                </div>

                {/* Address */}
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="flex items-center gap-1 font-medium text-xs uppercase text-muted-foreground">
                    {isPickup ? <><Clock className="h-3 w-3" /> Post Office Pickup</> : <><MapPin className="h-3 w-3" /> Ship To</>}
                  </p>
                  {isPickup ? (
                    <p className="text-foreground">{addr?.fullName} — arrange pickup</p>
                  ) : addr ? (
                    <>
                      <p className="text-foreground">{addr.fullName}</p>
                      <p className="text-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                      <p className="text-foreground">{addr.city}, {addr.state} {addr.zip}</p>
                      {addr.phone && <p className="text-muted-foreground">{addr.phone}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No address provided</p>
                  )}
                  {order.notes && <p className="text-xs text-muted-foreground italic mt-1">Note: {order.notes}</p>}
                </div>

                {/* Status update */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Update:</span>
                  <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="producing">Producing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
