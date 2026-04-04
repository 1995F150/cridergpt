import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, DollarSign, User, Plus, Minus, Trash2, Search, 
  CheckCircle, Loader2, Smartphone, Wifi, Nfc, Receipt, 
  ShoppingCart, UserPlus, History, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  productId?: string;
}

interface POSCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

interface POSTransaction {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  payment_method: string;
  status: string;
  items: CartItem[];
  created_at: string;
}

export function PointOfSale() {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<POSCustomer>({ name: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState<string>('card_reader');
  const [processing, setProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<POSTransaction | null>(null);
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; title: string; price: number }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Load store products for quick add
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('store_products')
        .select('id, title, price')
        .eq('is_active', true)
        .order('title');
      setProducts(data || []);
    })();
  }, []);

  const addProductToCart = (product: { id: string; title: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: crypto.randomUUID(), title: product.title, price: product.price, quantity: 1, productId: product.id }];
    });
  };

  const addCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    const price = parseFloat(customItemPrice);
    if (isNaN(price) || price <= 0) return;
    setCart(prev => [...prev, { id: crypto.randomUUID(), title: customItemName, price, quantity: 1 }]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.07; // 7% tax - configurable
  const total = subtotal + tax;

  const processPayment = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    if (!customer.name) {
      toast({ title: 'Customer name required', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Record the in-person transaction
      const transaction: POSTransaction = {
        id: crypto.randomUUID(),
        customer_name: customer.name,
        customer_email: customer.email,
        total,
        payment_method: paymentMethod,
        status: 'completed',
        items: cart,
        created_at: new Date().toISOString(),
      };

      // Store in pos_transactions table
      const { error } = await (supabase as any)
        .from('pos_transactions')
        .insert({
          id: transaction.id,
          seller_id: user?.id,
          customer_name: customer.name,
          customer_email: customer.email || null,
          customer_phone: customer.phone || null,
          subtotal_cents: Math.round(subtotal * 100),
          tax_cents: Math.round(tax * 100),
          total_cents: Math.round(total * 100),
          payment_method: paymentMethod,
          status: 'completed',
          items: cart,
          metadata: {},
        });

      if (error) throw error;

      setLastTransaction(transaction);
      toast({ title: 'Payment processed!', description: `$${total.toFixed(2)} — ${paymentMethod.replace('_', ' ')}` });
      
      // Reset
      setCart([]);
      setCustomer({ name: '', email: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      toast({ title: 'Payment Error', description: msg, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }, [cart, customer, paymentMethod, total, subtotal, tax, user]);

  const loadTransactionHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await (supabase as any)
        .from('pos_transactions')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(data?.map((t: any) => ({
        id: t.id,
        customer_name: t.customer_name,
        customer_email: t.customer_email || '',
        total: t.total_cents / 100,
        payment_method: t.payment_method,
        status: t.status,
        items: t.items || [],
        created_at: t.created_at,
      })) || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredProducts = products.filter(p => 
    !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const paymentMethods = [
    { value: 'card_reader', label: 'Card Reader', icon: CreditCard, desc: 'Stripe Terminal / Bluetooth reader' },
    { value: 'nfc_tap', label: 'NFC Tap to Pay', icon: Nfc, desc: 'Phone NFC contactless payment' },
    { value: 'cash', label: 'Cash', icon: DollarSign, desc: 'Cash payment' },
    { value: 'manual_card', label: 'Manual Card Entry', icon: Smartphone, desc: 'Type card number manually' },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Point of Sale</h2>
              <p className="text-xs text-muted-foreground">Process in-person payments for your products</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checkout" onValueChange={v => v === 'history' && loadTransactionHistory()}>
        <TabsList className="w-full">
          <TabsTrigger value="checkout" className="flex-1 gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Checkout
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Left: Product Picker + Custom Items */}
            <div className="space-y-4">
              {/* Quick Add from Store */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Add Products
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search store products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProducts.slice(0, 10).map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
                        onClick={() => addProductToCart(p)}
                      >
                        <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">${p.price.toFixed(2)}</span>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No products found</p>
                    )}
                  </div>

                  <Separator />

                  {/* Custom item */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Custom Item</p>
                    <div className="flex gap-2">
                      <Input placeholder="Item name" value={customItemName} onChange={e => setCustomItemName(e.target.value)} className="flex-1" />
                      <Input placeholder="$0.00" value={customItemPrice} onChange={e => setCustomItemPrice(e.target.value)} className="w-24" type="number" step="0.01" min="0" />
                      <Button size="icon" variant="outline" onClick={addCustomItem} disabled={!customItemName || !customItemPrice}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input placeholder="Customer name *" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Email (optional)" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} />
                    <Input placeholder="Phone (optional)" value={customer.phone || ''} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.value}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          paymentMethod === pm.value 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setPaymentMethod(pm.value)}
                      >
                        <pm.icon className={`h-5 w-5 mb-1 ${paymentMethod === pm.value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs font-medium">{pm.label}</p>
                        <p className="text-[10px] text-muted-foreground">{pm.desc}</p>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'card_reader' && (
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Wifi className="h-4 w-4" />
                        <p className="text-xs font-medium">Connect via Bluetooth or USB</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Stripe Terminal readers connect via Bluetooth or USB. Configure in Stripe Dashboard → Terminal.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'nfc_tap' && (
                    <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Nfc className="h-4 w-4" />
                        <p className="text-xs font-medium">Tap to Pay on Phone</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Use your Android phone as a contactless payment terminal via Stripe Tap to Pay.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Cart + Checkout */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cart</span>
                    <Badge variant="outline">{cart.length} items</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Add products to start a sale</p>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm font-bold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax (7%)</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">${total.toFixed(2)}</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-12 text-base gap-2" 
                        onClick={processPayment} 
                        disabled={processing || cart.length === 0}
                      >
                        {processing ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                        ) : (
                          <><CreditCard className="h-5 w-5" /> Charge ${total.toFixed(2)}</>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Last Transaction */}
              {lastTransaction && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-600 dark:text-green-400">Payment Successful</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>{lastTransaction.customer_name}</strong></p>
                      <p className="text-muted-foreground">{lastTransaction.payment_method.replace('_', ' ')} — ${lastTransaction.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">ID: {lastTransaction.id.slice(0, 8)}...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{t.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()} — {t.payment_method.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${t.total.toFixed(2)}</p>
                        <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
