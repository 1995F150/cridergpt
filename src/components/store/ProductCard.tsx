import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Truck, Package } from 'lucide-react';

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

interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
  onViewDetails: (product: StoreProduct) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const stockLabel = product.stock_quantity > 10
    ? `${product.stock_quantity} in stock`
    : product.stock_quantity > 0
    ? `Only ${product.stock_quantity} left`
    : 'Made to order';

  const stockColor = product.stock_quantity > 10
    ? 'text-green-600'
    : product.stock_quantity > 0
    ? 'text-amber-600'
    : 'text-muted-foreground';

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-border/60">
      <div className="relative aspect-square bg-muted overflow-hidden" onClick={() => onViewDetails(product)}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.free_shipping && (
            <Badge className="bg-green-600 text-white text-[10px] gap-1">
              <Truck className="h-3 w-3" /> FREE SHIPPING
            </Badge>
          )}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <Badge variant="destructive" className="text-[10px]">
              SALE {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight" onClick={() => onViewDetails(product)}>
          {product.title}
        </h3>

        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">${product.compare_at_price.toFixed(2)}</span>
          )}
        </div>

        <p className={`text-[11px] font-medium ${stockColor}`}>{stockLabel}</p>

        <Button
          className="w-full h-9 text-xs gap-1.5"
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
        >
          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
