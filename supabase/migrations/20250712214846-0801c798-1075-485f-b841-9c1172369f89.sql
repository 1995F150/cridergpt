-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  user_plan TEXT NOT NULL DEFAULT 'free',
  last_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON public.ai_usage
FOR SELECT USING (user_id = auth.uid() OR email = auth.email());

-- Users can update their own usage
CREATE POLICY "Users can update own usage" ON public.ai_usage
FOR UPDATE USING (user_id = auth.uid() OR email = auth.email());

-- Allow inserts for new users
CREATE POLICY "Allow inserts" ON public.ai_usage
FOR INSERT WITH CHECK (true);

-- Create function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.ai_usage 
  SET tokens_used = 0, last_reset = CURRENT_DATE, updated_at = NOW()
  WHERE last_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;