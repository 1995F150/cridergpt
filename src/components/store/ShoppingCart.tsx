import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart as CartIcon, Minus, Plus, Trash2, Loader2, MapPin, AlertTriangle, Clock, Truck, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    stripe_price_id: string | null;
    free_shipping: boolean;
    category: string;
    production_rate: number | null;
  };
}

export function ShoppingCartDrawer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  const [fullName, setFullName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const fetchCart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('store_cart_items')
      .select('id, product_id, quantity')
      .eq('user_id', user.id);

    if (data && data.length > 0) {
      const productIds = data.map((d: any) => d.product_id);
      const { data: products } = await (supabase as any)
        .from('store_products')
        .select('id, title, price, image_url, stock_quantity, stripe_price_id, free_shipping, category, production_rate')
        .in('id', productIds);

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      setItems(data.map((d: any) => ({ ...d, product: productMap.get(d.product_id) })));
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (open && user) fetchCart(); }, [open, user, fetchCart]);

  const updateQuantity = async (itemId: string, qty: number) => {
    if (qty <= 0) {
      await (supabase as any).from('store_cart_items').delete().eq('id', itemId);
    } else {
      await (supabase as any).from('store_cart_items').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', itemId);
    }
    fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    await (supabase as any).from('store_cart_items').delete().eq('user_id', user.id);
    setItems([]);
  };

  const subtotal = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const hasPhysical = items.some(i => i.product && !i.product.category?.includes('digital'));

  const getItemProductionInfo = (item: CartItem) => {
    if (!item.product || item.quantity <= item.product.stock_quantity) return null;
    const needed = item.quantity - item.product.stock_quantity;
    const rate = item.product.production_rate || 20;
    const days = Math.ceil(needed / rate);
    return { needed, days, inStock: item.product.stock_quantity };
  };

  const handleCheckout = async () => {
    if (!user) { navigate('/auth'); return; }
    if (items.length === 0) return;

    if (hasPhysical && !showShipping) {
      setShowShipping(true);
      return;
    }

    if (hasPhysical) {
      if (!fullName.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
        toast({ title: 'Complete shipping address', description: 'Full Name, Address, City, State, and ZIP are required.', variant: 'destructive' });
        return;
      }
    }

    setCheckoutLoading(true);
    try {
      // Build cart items payload for multi-item checkout
      const cartItemsPayload = items
        .filter(i => i.product?.stripe_price_id)
        .map(i => ({
          product_id: i.product_id,
          title: i.product?.title,
          price: i.product?.price,
          quantity: i.quantity,
          stripe_price_id: i.product?.stripe_price_id,
        }));

      if (cartItemsPayload.length === 0) {
        toast({ title: 'No products available for checkout', variant: 'destructive' });
        setCheckoutLoading(false);
        return;
      }

      const shippingAddress = hasPhysical ? {
        fullName: fullName.trim(),
        line1: addressLine1.trim(),
        line2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        notes: orderNotes.trim(),
        method: 'ship',
      } : null;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: cartItemsPayload[0].stripe_price_id,
          planName: 'store-order',
          quantity: cartItemsPayload[0].quantity,
          action: 'store-order',
          shippingAddress,
          cartItems: cartItemsPayload,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // DO NOT insert order here — webhook creates it after payment confirmation
        window.open(data.url, '_blank');
        setOpen(false);
      }
    } catch (err: any) {
      toast({ title: 'Checkout failed', description: err.message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <CartIcon className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-[10px] px-1">
              {cartCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CartIcon className="h-5 w-5" /> Shopping Cart
            {cartCount > 0 && <Badge variant="secondary">{cartCount} items</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !user ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground text-sm">Sign in to save items to your cart</p>
              <Button onClick={() => { navigate('/auth'); setOpen(false); }}>Sign In</Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Your cart is empty</p>
          ) : (
            items.map(item => {
              const prodInfo = getItemProductionInfo(item);
              return (
                <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                  {item.product?.image_url ? (
                    <img src={item.product.image_url} alt="" className="h-16 w-16 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium line-clamp-1">{item.product?.title}</p>
                    <p className="text-sm font-bold text-primary">${(item.product?.price || 0).toFixed(2)}</p>
                    {prodInfo && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5">
                        <Clock className="h-3 w-3" />
                        {prodInfo.inStock > 0
                          ? `${prodInfo.inStock} ship now, ${prodInfo.needed} in ~${prodInfo.days}d`
                          : `Production: ~${prodInfo.days} day${prodInfo.days > 1 ? 's' : ''}`
                        }
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => updateQuantity(item.id, 0)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {showShipping && hasPhysical && items.length > 0 && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> FREE SHIPPING on all orders!
                </p>
              </div>

              {/* Your Name */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Your Name
                </Label>
                <Input placeholder="First & Last Name *" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>

              {/* Shipping Address */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </Label>
                <Input placeholder="Street Address *" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
                <Input placeholder="Apt, Suite, Unit (optional)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City *" value={city} onChange={e => setCity(e.target.value)} />
                  <Input placeholder="State *" value={state} onChange={e => setState(e.target.value)} maxLength={2} />
                  <Input placeholder="ZIP *" value={zip} onChange={e => setZip(e.target.value)} maxLength={10} />
                </div>
              </div>

              <Textarea placeholder="Order notes (optional)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="h-14" />
            </div>
          )}
        </div>

        {items.length > 0 && user && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Shipping</span>
              <span>FREE</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">${subtotal.toFixed(2)}</span>
            </div>
            <Button className="w-full h-11" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : showShipping ? `Pay $${subtotal.toFixed(2)}` : 'Proceed to Checkout'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearCart}>Clear Cart</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export async function addToCart(userId: string, productId: string, quantity: number = 1) {
  const { data: existing } = await (supabase as any)
    .from('store_cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await (supabase as any)
      .from('store_cart_items')
      .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await (supabase as any)
      .from('store_cart_items')
      .insert({ user_id: userId, product_id: productId, quantity });
  }
}
