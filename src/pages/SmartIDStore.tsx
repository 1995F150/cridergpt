import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Store, User, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/store/ProductCard';
import { ShoppingCartDrawer, addToCart } from '@/components/store/ShoppingCart';
import { OrderHistory } from '@/components/store/OrderHistory';

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
  free_shipping: boolean;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Products',
  'smart-id': 'Smart ID Tags',
  accessories: 'Accessories',
  equipment: 'Equipment',
  digital: 'Digital',
  bundles: 'Bundles',
};

export default function SmartIDStore() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('store_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  const handleAddToCart = async (product: StoreProduct) => {
    if (!user) {
      toast({ title: 'Sign in to add items to cart', description: 'Create an account to save your cart and get discounts.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    await addToCart(user.id, product.id);
    toast({ title: `${product.title} added to cart` });
  };

  const handleAddSelectedToCart = async () => {
    if (!selectedProduct) return;
    if (!user) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    await addToCart(user.id, selectedProduct.id, quantity);
    toast({ title: `${quantity}× ${selectedProduct.title} added to cart` });
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Recommendations based on first product category
  const recommendations = selectedProduct
    ? products.filter(p => p.id !== selectedProduct.id && p.category === selectedProduct.category).slice(0, 4)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <SEO page="store" />

      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Store className="h-5 w-5" /> CriderGPT Store
              </h1>
              <p className="text-xs text-muted-foreground">Official products by Jessie Crider</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/auth')}>
                <User className="h-3.5 w-3.5" /> Sign in for discounts
              </Button>
            )}
            <ShoppingCartDrawer />
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-card border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-square bg-muted">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
                {selectedProduct.free_shipping && (
                  <Badge className="absolute top-3 left-3 bg-green-600 text-white text-xs">FREE SHIPPING</Badge>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <Badge variant="outline" className="text-[10px] mb-2">{selectedProduct.category}</Badge>
                  <h2 className="text-xl font-bold">{selectedProduct.title}</h2>
                </div>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">${selectedProduct.price.toFixed(2)}</span>
                  {selectedProduct.compare_at_price && selectedProduct.compare_at_price > selectedProduct.price && (
                    <span className="text-sm text-muted-foreground line-through">${selectedProduct.compare_at_price.toFixed(2)}</span>
                  )}
                </div>
                <p className={`text-sm font-medium ${selectedProduct.stock_quantity > 10 ? 'text-green-600' : selectedProduct.stock_quantity > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {selectedProduct.stock_quantity > 10 ? `${selectedProduct.stock_quantity} in stock` : selectedProduct.stock_quantity > 0 ? `Only ${selectedProduct.stock_quantity} left` : 'Made to order'}
                </p>

                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</Button>
                  <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-center" />
                  <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>+</Button>
                </div>
                {quantity > selectedProduct.stock_quantity && selectedProduct.stock_quantity > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                    ⚠️ Custom order — exceeds stock. Allow extra production time.
                  </p>
                )}
                <div className="text-lg font-bold flex justify-between">
                  <span>Total</span>
                  <span className="text-primary">${(selectedProduct.price * quantity).toFixed(2)}</span>
                </div>

                <Button className="w-full h-11" onClick={handleAddSelectedToCart}>
                  Add {quantity} to Cart — ${(selectedProduct.price * quantity).toFixed(2)}
                </Button>

                <Button variant="ghost" className="w-full text-xs" onClick={() => setSelectedProduct(null)}>
                  Continue Shopping
                </Button>
              </div>
            </div>
            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="border-t p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> You might also like</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {recommendations.map(r => (
                    <button key={r.id} className="text-left border rounded-lg p-2 hover:bg-muted/50 transition-colors" onClick={() => { setSelectedProduct(r); setQuantity(1); }}>
                      {r.image_url && <img src={r.image_url} alt="" className="w-full aspect-square rounded object-cover mb-1" />}
                      <p className="text-xs font-medium line-clamp-1">{r.title}</p>
                      <p className="text-xs text-primary font-bold">${r.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="shop">
          <TabsList className="mb-4">
            <TabsTrigger value="shop">Shop</TabsTrigger>
            {user && <TabsTrigger value="orders">My Orders</TabsTrigger>}
          </TabsList>

          <TabsContent value="shop" className="space-y-4">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(c => (
                  <Button
                    key={c}
                    variant={category === c ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setCategory(c)}
                  >
                    {CATEGORY_LABELS[c] || c}
                  </Button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No products found</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetails={p => { setSelectedProduct(p); setQuantity(1); }}
                  />
                ))}
              </div>
            )}

            {/* Sign-in promo */}
            {!user && products.length > 0 && (
              <>
                <Separator />
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm font-medium">Sign in to save your cart, track orders & get exclusive discounts</p>
                  <Button onClick={() => navigate('/auth')}>Create Account</Button>
                </div>
              </>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="orders">
              <OrderHistory />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
