import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  created_at: string;
  user_id: string;
}

interface ProductReviewsProps {
  productId: string;
}

function StarRating({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'} ${interactive ? 'cursor-pointer hover:text-amber-400' : ''}`}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    fetchReviews();
    checkPurchase();
  }, [productId, user]);

  const fetchReviews = async () => {
    const { data } = await (supabase as any)
      .from('store_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    setReviews(data || []);
    if (user && data) {
      setHasReviewed(data.some((r: Review) => r.user_id === user.id));
    }
  };

  const checkPurchase = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('store_orders')
      .select('id, items')
      .eq('user_id', user.id)
      .in('status', ['paid', 'shipped', 'delivered']);
    if (data) {
      const purchased = data.some((o: any) =>
        Array.isArray(o.items) && o.items.some((i: any) => i.product_id === productId)
      );
      setHasPurchased(purchased);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from('store_reviews').insert({
      product_id: productId,
      user_id: user.id,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
      verified_purchase: hasPurchased,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Review submitted!' });
      setShowForm(false);
      setTitle('');
      setBody('');
      fetchReviews();
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Reviews</h4>
          {avgRating && (
            <div className="flex items-center gap-1">
              <StarRating rating={Math.round(Number(avgRating))} />
              <span className="text-xs text-muted-foreground">({avgRating} · {reviews.length})</span>
            </div>
          )}
        </div>
        {user && !hasReviewed && (
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowForm(!showForm)}>
            Write a Review
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <StarRating rating={rating} onRate={setRating} interactive />
          <Input placeholder="Review title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" />
          <Textarea placeholder="Your review..." value={body} onChange={e => setBody(e.target.value)} className="h-16 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={handleSubmit} disabled={submitting}>Submit</Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-xs text-muted-foreground">No reviews yet</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {reviews.map(r => (
            <div key={r.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                {r.verified_purchase && (
                  <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3" /> Verified Purchase
                  </Badge>
                )}
              </div>
              {r.title && <p className="text-sm font-medium">{r.title}</p>}
              {r.body && <p className="text-xs text-muted-foreground">{r.body}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
