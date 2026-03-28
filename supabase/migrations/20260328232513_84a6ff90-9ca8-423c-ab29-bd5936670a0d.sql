
-- Product Ideas Tracker table
CREATE TABLE public.product_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'idea',
  materials JSONB DEFAULT '[]'::jsonb,
  est_cost NUMERIC(10,2),
  sell_price NUMERIC(10,2),
  notes TEXT,
  is_patented BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can do everything on product_ideas"
  ON public.product_ideas
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  );

-- Tag Orders table
CREATE TABLE public.tag_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) DEFAULT 3.50,
  total_price NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  stripe_session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tag_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own tag orders"
  ON public.tag_orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can do everything on tag_orders"
  ON public.tag_orders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert tag orders"
  ON public.tag_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());
