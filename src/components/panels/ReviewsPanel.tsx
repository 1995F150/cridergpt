import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export function ReviewsPanel() {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reviews, setReviews] = useState([
    // Example reviews for demo
    { stars: 5, text: "This AI is literally built different. CriderOS is 🔥.", user: "Jessie" },
    { stars: 4, text: "Needs dark mode on my toaster, but solid.", user: "Anonymous" }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating && review) {
      setReviews([{ stars: rating, text: review, user: "You" }, ...reviews]);
      setRating(0);
      setReview('');
    }
  };

  const avg = (reviews.reduce((a, b) => a + b.stars, 0) / reviews.length).toFixed(1);

  return (
    <div className="flex-1 p-6 bg-background overflow-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            CriderOS Reviews
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
              disabled={!rating || !review}
              className="w-full sm:w-auto"
            >
              Submit Review
            </Button>
          </form>

          {/* Reviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reviews ({reviews.length})</h3>
            
            {reviews.length === 0 && (
              <p className="text-muted-foreground">No reviews yet. Be the first to rate CriderOS!</p>
            )}
            
            {reviews.map((r, idx) => (
              <Card key={idx} className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {[...Array(r.stars)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {r.user}
                    </Badge>
                  </div>
                  <p className="text-foreground">{r.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}