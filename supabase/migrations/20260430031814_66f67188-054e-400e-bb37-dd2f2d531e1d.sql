-- Public bucket for user reference photos (truck, blueprints, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-references', 'user-references', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read references (public bucket)
DO $$ BEGIN
  CREATE POLICY "Public read user-references"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'user-references');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload to their own folder
DO $$ BEGIN
  CREATE POLICY "Users upload own user-references"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'user-references'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own user-references"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'user-references'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own user-references"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'user-references'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reference library table — named refs the user (and AI) can pull on demand
CREATE TABLE IF NOT EXISTS public.user_reference_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,                 -- e.g. "My Truck", "Future House Blueprint"
  slug TEXT NOT NULL,                 -- e.g. "my-truck", "future-house"
  category TEXT NOT NULL DEFAULT 'general',  -- vehicle | blueprint | place | object | general
  description TEXT,
  image_url TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',     -- auto-attach trigger words
  auto_attach BOOLEAN NOT NULL DEFAULT true,
  use_for TEXT[] NOT NULL DEFAULT ARRAY['image','blueprint'],
  is_global BOOLEAN NOT NULL DEFAULT false,  -- owner-seeded refs visible to all
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

ALTER TABLE public.user_reference_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own + global refs"
  ON public.user_reference_library FOR SELECT
  USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users insert own refs"
  ON public.user_reference_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own refs"
  ON public.user_reference_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own refs"
  ON public.user_reference_library FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_reference_library_updated
  BEFORE UPDATE ON public.user_reference_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_reference_library_user ON public.user_reference_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reference_library_slug ON public.user_reference_library(slug);
CREATE INDEX IF NOT EXISTS idx_user_reference_library_keywords ON public.user_reference_library USING GIN(keywords);