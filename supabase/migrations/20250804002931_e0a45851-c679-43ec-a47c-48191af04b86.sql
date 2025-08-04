
-- Create a table to store plan configurations dynamically
CREATE TABLE public.plan_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  plan_display_name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default plan configurations
INSERT INTO public.plan_configurations (plan_name, plan_display_name, price_monthly, features, limits, sort_order) VALUES
('free', 'CriderGPT Free', 0, 
  '["AI Chat (13 tokens/month)", "TTS (5 requests/month)", "1 Project", "2 API Key Slots", "Basic File Upload (10MB)", "System Updates Access", "Community Support"]'::jsonb,
  '{"tokens": 13, "tts": 5, "projects": 1, "api_keys": 2, "file_upload_mb": 10}'::jsonb,
  1),
('plus', 'CriderGPT Plus', 9.99,
  '["AI Chat (200 tokens/month)", "TTS (100 requests/month)", "Backend Code Generator", "Project Management (5 projects)", "5 API Key Slots", "Standard File Upload (100MB)", "Activity Updates Tracking", "System Updates Access", "Email Support"]'::jsonb,
  '{"tokens": 200, "tts": 100, "projects": 5, "api_keys": 5, "file_upload_mb": 100}'::jsonb,
  2),
('pro', 'CriderGPT Pro', 20.99,
  '["AI Chat (500 tokens/month)", "TTS (Unlimited)", "Advanced Backend Code Generator", "Unlimited Projects", "Unlimited API Keys", "Premium File Upload (1GB)", "Advanced Activity Analytics", "Real-time Updates & Notifications", "FS22/FS25 Mod Deployment", "Priority Support", "Custom Automation Scripts", "Advanced Security Features"]'::jsonb,
  '{"tokens": 500, "tts": 9999999, "projects": -1, "api_keys": -1, "file_upload_mb": 1000}'::jsonb,
  3);

-- Enable Row Level Security
ALTER TABLE public.plan_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to active plans
CREATE POLICY "Public can view active plans" ON public.plan_configurations
FOR SELECT
USING (is_active = true);

-- Create policy for admin/service role to manage plans
CREATE POLICY "Service role can manage plans" ON public.plan_configurations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to get plan features dynamically
CREATE OR REPLACE FUNCTION public.get_plan_features(plan_name_input text)
RETURNS TABLE(
  plan_name text,
  plan_display_name text,
  price_monthly decimal,
  features jsonb,
  limits jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.plan_name,
    pc.plan_display_name,
    pc.price_monthly,
    pc.features,
    pc.limits
  FROM public.plan_configurations pc
  WHERE pc.plan_name = plan_name_input 
    AND pc.is_active = true;
END;
$$;

-- Create function to check if user has specific feature access
CREATE OR REPLACE FUNCTION public.user_has_feature_access(feature_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan text;
  plan_features jsonb;
  has_access boolean := false;
BEGIN
  -- Get user's current plan
  SELECT COALESCE(user_plan, 'free') INTO user_plan
  FROM public.ai_usage
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- If no usage record, default to free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Get plan features
  SELECT features INTO plan_features
  FROM public.plan_configurations
  WHERE plan_name = user_plan AND is_active = true;
  
  -- Check if feature exists in plan
  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(plan_features) AS feature
    WHERE feature ILIKE '%' || feature_name || '%'
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Create function to get all active plans for frontend
CREATE OR REPLACE FUNCTION public.get_all_active_plans()
RETURNS TABLE(
  plan_name text,
  plan_display_name text,
  price_monthly decimal,
  features jsonb,
  limits jsonb,
  sort_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.plan_name,
    pc.plan_display_name,
    pc.price_monthly,
    pc.features,
    pc.limits,
    pc.sort_order
  FROM public.plan_configurations pc
  WHERE pc.is_active = true
  ORDER BY pc.sort_order;
END;
$$;
