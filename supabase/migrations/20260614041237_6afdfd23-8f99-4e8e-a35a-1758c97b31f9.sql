
-- Promo video library
CREATE TABLE public.promo_video_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  topic_tag TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  times_used INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_video_library TO authenticated;
GRANT ALL ON public.promo_video_library TO service_role;
ALTER TABLE public.promo_video_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage promo videos" ON public.promo_video_library
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Settings (single row)
CREATE TABLE public.auto_promo_settings (
  id INT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  hourly_cap INT NOT NULL DEFAULT 1,
  min_gap_minutes INT NOT NULL DEFAULT 55,
  topics TEXT[] NOT NULL DEFAULT ARRAY['cridergpt','store','livestock','ffa','rdr2'],
  last_run_at TIMESTAMPTZ,
  last_posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.auto_promo_settings TO authenticated;
GRANT ALL ON public.auto_promo_settings TO service_role;
ALTER TABLE public.auto_promo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage auto promo settings" ON public.auto_promo_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.auto_promo_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Caption history (for 7-day dedup)
CREATE TABLE public.auto_promo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_hash TEXT NOT NULL,
  topic TEXT,
  video_id UUID REFERENCES public.promo_video_library(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auto_promo_history_created ON public.auto_promo_history(created_at DESC);
CREATE INDEX idx_auto_promo_history_hash ON public.auto_promo_history(caption_hash);
GRANT SELECT, INSERT, DELETE ON public.auto_promo_history TO authenticated;
GRANT ALL ON public.auto_promo_history TO service_role;
ALTER TABLE public.auto_promo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view auto promo history" ON public.auto_promo_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Hourly cron
SELECT cron.schedule(
  'auto-generate-promo-post-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/auto-generate-promo-post',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);
