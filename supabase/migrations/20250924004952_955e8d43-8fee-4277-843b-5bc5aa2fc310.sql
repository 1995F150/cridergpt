-- Add lifetime plan configuration and demo tracking
-- Add lifetime_access column to plan_configurations
ALTER TABLE public.plan_configurations 
ADD COLUMN IF NOT EXISTS lifetime_access boolean DEFAULT false;

-- Add lifetime buyer count tracking
CREATE TABLE IF NOT EXISTS public.lifetime_plan_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lifetime_plan_count integer DEFAULT 0,
  max_lifetime_buyers integer DEFAULT 35,
  promotion_end_date timestamp with time zone NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert initial lifetime config
INSERT INTO public.lifetime_plan_config (lifetime_plan_count, max_lifetime_buyers, is_active)
VALUES (0, 35, true)
ON CONFLICT DO NOTHING;

-- Add demo usage tracking table
CREATE TABLE IF NOT EXISTS public.demo_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  ip_address text,
  user_agent text,
  messages_sent integer DEFAULT 0,
  max_messages integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now(),
  UNIQUE(session_id)
);

-- RLS policies for demo_usage
ALTER TABLE public.demo_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage demo usage" ON public.demo_usage
FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for lifetime_plan_config  
ALTER TABLE public.lifetime_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lifetime config" ON public.lifetime_plan_config
FOR SELECT USING (true);

CREATE POLICY "Service role can manage lifetime config" ON public.lifetime_plan_config
FOR ALL USING (true) WITH CHECK (true);

-- Insert lifetime plan configuration
INSERT INTO public.plan_configurations 
(plan_name, plan_display_name, price_monthly, features, limits, lifetime_access, sort_order, stripe_price_id)
VALUES (
  'lifetime',
  'CriderGPT Lifetime Founder',
  299.99,
  '["Unlimited everything forever", "Early access to new features", "Lifetime Founder badge", "Priority support", "All future features included", "No monthly fees ever"]'::jsonb,
  '{"tokens": 999999, "tts": 999999, "projects": 999999, "api_keys": 999999, "file_upload_mb": 999999, "calculators": 999999, "documents": 999999}'::jsonb,
  true,
  4,
  'price_lifetime_founder_plan' -- Placeholder - replace with actual Stripe price ID
)
ON CONFLICT (plan_name) DO UPDATE SET
  plan_display_name = EXCLUDED.plan_display_name,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  lifetime_access = EXCLUDED.lifetime_access,
  sort_order = EXCLUDED.sort_order;