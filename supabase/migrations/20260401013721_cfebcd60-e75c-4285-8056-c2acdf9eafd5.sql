
-- Add production_rate to store_products
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS production_rate integer DEFAULT 20;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS sku text;

-- Product reviews table
CREATE TABLE public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.store_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews" ON public.store_reviews
  FOR SELECT USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create own reviews" ON public.store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.store_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.store_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
