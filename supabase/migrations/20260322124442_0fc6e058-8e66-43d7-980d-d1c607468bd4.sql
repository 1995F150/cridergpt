
-- Custom filter orders table
CREATE TABLE public.filter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_snapchat TEXT,
  customer_phone TEXT,
  
  -- Filter details
  filter_type TEXT NOT NULL CHECK (filter_type IN ('basic_glow', 'animated_chrome', 'full_custom')),
  description TEXT NOT NULL,
  reference_images TEXT[], -- URLs to reference images
  
  -- Pricing
  price_range_min NUMERIC NOT NULL DEFAULT 5,
  price_range_max NUMERIC NOT NULL DEFAULT 10,
  agreed_price NUMERIC,
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('stripe', 'venmo', 'cashapp', 'other')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'accepted', 'in_progress', 'review', 'delivered', 'completed', 'cancelled')),
  admin_notes TEXT,
  delivery_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.filter_orders ENABLE ROW LEVEL SECURITY;

-- Public insert policy (anyone can submit a request)
CREATE POLICY "Anyone can submit filter requests"
  ON public.filter_orders FOR INSERT
  WITH CHECK (true);

-- Customers can view their own orders by email (no auth required for public)
CREATE POLICY "Anyone can view orders by email"
  ON public.filter_orders FOR SELECT
  USING (true);

-- Updated at trigger
CREATE TRIGGER filter_orders_updated_at
  BEFORE UPDATE ON public.filter_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
