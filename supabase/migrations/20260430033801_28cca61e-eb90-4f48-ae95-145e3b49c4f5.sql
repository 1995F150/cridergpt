
-- Public API keys for external clients to call CriderGPT
CREATE TABLE IF NOT EXISTS public.cridergpt_public_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['chat'],
  rate_limit_per_min INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.cridergpt_public_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own api keys" ON public.cridergpt_public_api_keys
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own api keys" ON public.cridergpt_public_api_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own api keys" ON public.cridergpt_public_api_keys
FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes own api keys" ON public.cridergpt_public_api_keys
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pub_api_keys_hash ON public.cridergpt_public_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_pub_api_keys_user ON public.cridergpt_public_api_keys(user_id);

-- Usage log for the public API
CREATE TABLE IF NOT EXISTS public.cridergpt_public_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.cridergpt_public_api_keys(id) ON DELETE CASCADE,
  user_id UUID,
  endpoint TEXT NOT NULL,
  status INT NOT NULL,
  tokens_used INT,
  routed_to TEXT, -- 'local' | 'cloud'
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cridergpt_public_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own api usage" ON public.cridergpt_public_api_usage
FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pub_api_usage_key ON public.cridergpt_public_api_usage(api_key_id, created_at DESC);

-- Hybrid router settings (singleton-style: per user)
CREATE TABLE IF NOT EXISTS public.hybrid_router_settings (
  user_id UUID PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  local_endpoint TEXT, -- e.g. https://vm.cridergpt.com/ollama or http via agent
  local_model TEXT NOT NULL DEFAULT 'llama3.2:3b',
  prefer_local_for TEXT[] NOT NULL DEFAULT ARRAY['casual','simple','classification','summary'],
  cloud_fallback BOOLEAN NOT NULL DEFAULT true,
  max_local_latency_ms INT NOT NULL DEFAULT 30000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hybrid_router_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages router settings" ON public.hybrid_router_settings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
