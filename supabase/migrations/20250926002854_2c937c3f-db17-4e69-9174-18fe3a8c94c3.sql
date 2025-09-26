-- Create feature_usage table for tracking feature usage
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_audit table for security and system events
CREATE TABLE IF NOT EXISTS public.system_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  risk_level TEXT DEFAULT 'low',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feature_settings table for user feature preferences
CREATE TABLE IF NOT EXISTS public.feature_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  harvest_helper_enabled BOOLEAN DEFAULT false,
  tech_tillage_enabled BOOLEAN DEFAULT false,
  innovator_enabled BOOLEAN DEFAULT false,
  savannah_tone_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feature_usage
CREATE POLICY "Users can insert their own feature usage" ON public.feature_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feature usage" ON public.feature_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for system_audit
CREATE POLICY "Users can view their own audit logs" ON public.system_audit
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage audit logs" ON public.system_audit
  FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for feature_settings
CREATE POLICY "Users can manage their own feature settings" ON public.feature_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating feature_settings timestamp
CREATE OR REPLACE FUNCTION update_feature_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_settings_updated_at
  BEFORE UPDATE ON public.feature_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_settings_updated_at();