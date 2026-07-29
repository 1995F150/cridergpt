CREATE TABLE public.pos_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_label TEXT NOT NULL DEFAULT 'Chicks',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  method TEXT NOT NULL DEFAULT 'reader',
  status TEXT NOT NULL DEFAULT 'pending',
  reader_id TEXT,
  payment_intent_id TEXT,
  checkout_url TEXT,
  customer_name TEXT,
  customer_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;

ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own POS sales"
ON public.pos_sales FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pos_sales_user_created ON public.pos_sales (user_id, created_at DESC);

CREATE TRIGGER update_pos_sales_updated_at
BEFORE UPDATE ON public.pos_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();