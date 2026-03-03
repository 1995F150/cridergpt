
-- 1. cridergpt_api_keys
CREATE TABLE public.cridergpt_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  key_hash text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  rate_limit_per_minute integer DEFAULT 60,
  active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE public.cridergpt_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api keys" ON public.cridergpt_api_keys FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. cridergpt_api_settings
CREATE TABLE public.cridergpt_api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kill_switch boolean DEFAULT false,
  endpoint_overrides jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.cridergpt_api_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api settings" ON public.cridergpt_api_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. cridergpt_api_logs
CREATE TABLE public.cridergpt_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  endpoint text,
  command text,
  status text DEFAULT 'ok',
  flags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cridergpt_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api logs" ON public.cridergpt_api_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. api_keywords
CREATE TABLE public.api_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  action text NOT NULL,
  description text,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.api_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage keywords" ON public.api_keywords FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read keywords" ON public.api_keywords FOR SELECT USING (true);

-- 5. cridergpt_training_corpus (unified view table)
CREATE TABLE public.cridergpt_training_corpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid,
  category text DEFAULT 'general',
  topic text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cridergpt_training_corpus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage corpus" ON public.cridergpt_training_corpus FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read corpus" ON public.cridergpt_training_corpus FOR SELECT USING (true);

-- Seed default keywords
INSERT INTO public.api_keywords (keyword, action, description) VALUES
  ('agent_mode', 'agent_mode', 'Queue command for local PC agent execution'),
  ('pc_agent', 'pc_agent', 'Queue command for local PC agent execution'),
  ('convert_app_code', 'convert_app_code', 'Convert web code to Android Studio project'),
  ('open_github', 'open_github', 'Open GitHub repository'),
  ('generate_photo', 'generate_photo', 'Generate AI photo');
