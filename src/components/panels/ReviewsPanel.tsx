import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string;
}

export function ReviewsPanel() {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to submit a review');
      return;
    }
    
    if (!rating || !review) {
      toast.error('Please provide both a rating and review text');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          rating,
          review_text: review
        });

      if (error) throw error;
      
      toast.success('Review submitted successfully!');
      setRating(0);
      setReview('');
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const avg = reviews.length > 0 
    ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="flex-1 p-6 bg-background overflow-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            CriderGPT Reviews
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            Average Rating: <span className="font-bold text-foreground">{avg} / 5</span>
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Rating</label>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 transition-colors ${
                      star <= rating 
                        ? "text-yellow-500" 
                        : "text-muted-foreground hover:text-yellow-500"
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Your Review</label>
              <Textarea
                rows={3}
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Drop your review here (keep it Gen Z 🔥)..."
                className="resize-none"
              />
            </div>
            
            <Button
              type="submit"
              disabled={!rating || !review || submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>

          {/* Reviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reviews ({reviews.length})</h3>
            
            {loading && (
              <p className="text-muted-foreground">Loading reviews...</p>
            )}
            
            {!loading && reviews.length === 0 && (
              <p className="text-muted-foreground">No reviews yet. Be the first to rate CriderGPT!</p>
            )}
            
            {reviews.map((r) => (
              <Card key={r.id} className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-foreground">{r.review_text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}