import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CreditCard, Loader2, RefreshCw, Wifi, Link2, CheckCircle2, XCircle, Clock, Egg,
} from 'lucide-react';

interface Reader {
  id: string;
  label: string | null;
  device_type: string | null;
  status: string | null;
  serial_number: string | null;
  server_drivable: boolean;
}

interface Sale {
  id: string;
  item_label: string;
  quantity: number;
  amount_cents: number;
  method: string;
  status: string;
  customer_name: string | null;
  created_at: string;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function ChickPOSPanel() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReader, setSelectedReader] = useState<string | null>(null);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [charging, setCharging] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);

  const [itemLabel, setItemLabel] = useState('Chicks');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('5.00');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const total = (parseFloat(unitPrice || '0') || 0) * (parseInt(quantity || '0', 10) || 0);

  const call = async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in first');
    const { data, error } = await supabase.functions.invoke('terminal-pos', {
      body: payload,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadReaders = async () => {
    setLoadingReaders(true);
    try {
      const data = await call({ action: 'list_readers' });
      setReaders(data.readers || []);
      if (!selectedReader && data.readers?.length) setSelectedReader(data.readers[0].id);
      if (!data.readers?.length) toast.info('No readers registered in Stripe yet.');
    } catch (e: any) {
      toast.error(e.message || 'Could not load readers');
    } finally {
      setLoadingReaders(false);
    }
  };

  const loadSales = async () => {
    const { data } = await (supabase as any)
      .from('pos_sales')
      .select('id,item_label,quantity,amount_cents,method,status,customer_name,created_at')
      .order('created_at', { ascending: false })
      .limit(15);
    if (data) setSales(data);
  };

  useEffect(() => { loadReaders(); loadSales(); /* eslint-disable-next-line */ }, []);

  // Poll the pending payment until it clears
  useEffect(() => {
    if (!pendingIntent) return;
    const t = setInterval(async () => {
      try {
        const { status } = await call({ action: 'check_status', payment_intent_id: pendingIntent });
        if (status === 'succeeded') {
          toast.success('Payment collected!');
          setPendingIntent(null);
          loadSales();
        } else if (status === 'canceled') {
          toast.error('Payment canceled');
          setPendingIntent(null);
          loadSales();
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(t);
  }, [pendingIntent]);

  const charge = async (method: 'reader' | 'link') => {
    if (total < 0.5) { toast.error('Total must be at least $0.50'); return; }
    setCharging(true);
    try {
      const data = await call({
        action: 'charge',
        method,
        item_label: itemLabel || 'Chicks',
        quantity: parseInt(quantity || '1', 10),
        unit_price: parseFloat(unitPrice || '0'),
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        reader_id: method === 'reader' ? selectedReader : null,
      });

      if (data.mode === 'link' && data.url) {
        await navigator.clipboard.writeText(data.url).catch(() => {});
        window.open(data.url, '_blank');
        toast.success('Payment link opened & copied');
        setPendingIntent(data.sale?.payment_intent_id ?? null);
      } else {
        toast.success(data.message || 'Sent to reader');
        setPendingIntent(data.payment_intent_id);
      }
      loadSales();
    } catch (e: any) {
      toast.error(e.message || 'Charge failed');
    } finally {
      setCharging(false);
    }
  };

  const cancel = async () => {
    try {
      await call({ action: 'cancel', payment_intent_id: pendingIntent, reader_id: selectedReader });
      setPendingIntent(null);
      toast.info('Canceled');
      loadSales();
    } catch (e: any) { toast.error(e.message); }
  };

  const statusIcon = (s: string) =>
    s === 'paid' ? <CheckCircle2 className="h-4 w-4 text-green-500" />
      : s === 'canceled' ? <XCircle className="h-4 w-4 text-destructive" />
      : <Clock className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Egg className="h-6 w-6" /> Chick Sales POS
          </h1>
          <p className="text-sm text-muted-foreground">
            Charge customers in person with your Stripe card reader.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadReaders} disabled={loadingReaders}>
          {loadingReaders ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh readers</span>
        </Button>
      </div>

      {/* Readers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4" /> Card readers</CardTitle>
          <CardDescription>Registered to your Stripe account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {readers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No readers found. Pair your Stripe Reader M2 in the Stripe Dashboard under Terminal → Readers.
            </p>
          )}
          {readers.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReader(r.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedReader === r.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.label || r.device_type || r.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.device_type} · {r.serial_number || r.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                    {r.status || 'unknown'}
                  </Badge>
                  {!r.server_drivable && <Badge variant="outline" className="text-xs">mobile app</Badge>}
                </div>
              </div>
            </button>
          ))}
          {readers.some((r) => !r.server_drivable) && (
            <p className="text-xs text-muted-foreground pt-1">
              Bluetooth readers like the Reader M2 connect through the CriderGPT mobile app. The web
              app still creates the charge, then you tap it on the reader in the app — or send a
              payment link instead.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sale form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> New sale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Item</Label>
              <Input value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} placeholder="Chicks" />
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Price each ($)</Label>
              <Input type="number" step="0.25" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Customer name (optional)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Customer email (optional)</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">${total.toFixed(2)}</span>
          </div>

          {pendingIntent ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm rounded-lg border p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting on the customer's payment…
              </div>
              <Button variant="outline" className="w-full" onClick={cancel}>Cancel payment</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              <Button onClick={() => charge('reader')} disabled={charging || !selectedReader} className="gap-2">
                {charging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Charge on reader
              </Button>
              <Button variant="outline" onClick={() => charge('link')} disabled={charging} className="gap-2">
                <Link2 className="h-4 w-4" /> Send payment link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent sales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent sales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sales.length === 0 && <p className="text-sm text-muted-foreground">No sales yet.</p>}
          {sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-3 min-w-0">
                {statusIcon(s.status)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.item_label} × {s.quantity}
                    {s.customer_name ? ` · ${s.customer_name}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()} · {s.method}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold shrink-0">{money(s.amount_cents)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChickPOSPanel;
