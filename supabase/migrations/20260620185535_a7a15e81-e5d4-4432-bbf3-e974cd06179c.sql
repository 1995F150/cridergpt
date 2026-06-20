CREATE TABLE public.fermentation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  day_number INTEGER,
  image_url TEXT,
  report JSONB,
  grade TEXT,
  score INTEGER,
  stage_observed TEXT,
  product_type TEXT,
  ingredients TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fermentation_logs TO authenticated;
GRANT ALL ON public.fermentation_logs TO service_role;
ALTER TABLE public.fermentation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fermentation logs" ON public.fermentation_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX fermentation_logs_user_batch_idx ON public.fermentation_logs(user_id, batch_name, created_at DESC);