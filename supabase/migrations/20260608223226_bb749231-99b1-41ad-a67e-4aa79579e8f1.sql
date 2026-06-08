CREATE TABLE public.android_app_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  pkg TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0.99,
  builder_tool TEXT NOT NULL DEFAULT 'android-studio',
  needs_backend BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'idea',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_android_app_ideas_user ON public.android_app_ideas(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.android_app_ideas TO authenticated;
GRANT ALL ON public.android_app_ideas TO service_role;

ALTER TABLE public.android_app_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own app ideas"
  ON public.android_app_ideas
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER android_app_ideas_set_updated_at
  BEFORE UPDATE ON public.android_app_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();