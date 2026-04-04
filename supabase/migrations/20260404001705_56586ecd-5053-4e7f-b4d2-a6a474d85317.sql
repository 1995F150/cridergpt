
-- In-App Purchase records table
CREATE TABLE public.iap_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('consumable', 'subscription')),
  transaction_id TEXT,
  original_transaction_id TEXT,
  receipt_data TEXT,
  purchase_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded', 'expired')),
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_iap_purchases_user_id ON public.iap_purchases(user_id);
CREATE INDEX idx_iap_purchases_transaction ON public.iap_purchases(transaction_id);
CREATE INDEX idx_iap_purchases_platform ON public.iap_purchases(platform, status);

-- RLS
ALTER TABLE public.iap_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.iap_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all purchases"
  ON public.iap_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
