-- Add user_id and discount tracking to filter_orders
ALTER TABLE public.filter_orders 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text;

-- Index for looking up user's order count
CREATE INDEX IF NOT EXISTS idx_filter_orders_user_id ON public.filter_orders(user_id);