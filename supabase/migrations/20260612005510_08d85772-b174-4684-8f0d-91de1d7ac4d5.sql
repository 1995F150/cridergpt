
-- Queue table
CREATE TABLE public.marketing_auto_post_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('store_product','seo_guide','livestock_animal','manual')),
  source_id uuid,
  caption text not null,
  media_url text,
  video_url text,
  status text not null default 'pending' check (status in ('pending','processing','posted','failed','cancelled')),
  scheduled_for timestamptz not null default now(),
  privacy_level text not null default 'PUBLIC_TO_EVERYONE',
  tiktok_publish_id text,
  tiktok_post_url text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_auto_post_queue TO authenticated;
GRANT ALL ON public.marketing_auto_post_queue TO service_role;

ALTER TABLE public.marketing_auto_post_queue ENABLE ROW LEVEL SECURITY;

-- Only owners (system_owners) can read/manage
CREATE POLICY "Owners manage marketing queue"
  ON public.marketing_auto_post_queue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.system_owners so WHERE so.id = auth.uid() AND so.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.system_owners so WHERE so.id = auth.uid() AND so.is_active = true));

CREATE INDEX idx_marketing_queue_status_sched ON public.marketing_auto_post_queue(status, scheduled_for);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_marketing_queue()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_touch_marketing_queue
  BEFORE UPDATE ON public.marketing_auto_post_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_marketing_queue();

-- Enqueue on new store product
CREATE OR REPLACE FUNCTION public.enqueue_marketing_store_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO public.marketing_auto_post_queue(source, source_id, caption, media_url)
    VALUES (
      'store_product', NEW.id,
      '🆕 Just dropped at the CriderGPT store: ' || NEW.title ||
        coalesce(' — $' || NEW.price::text, '') ||
        E'\nGrab one at cridergpt.com/store #FFA #LivestockShow #CriderGPT',
      NEW.image_url
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enqueue_store_product
  AFTER INSERT ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_marketing_store_product();

-- Enqueue on new SEO guide
CREATE OR REPLACE FUNCTION public.enqueue_marketing_seo_guide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published = true THEN
    INSERT INTO public.marketing_auto_post_queue(source, source_id, caption)
    VALUES (
      'seo_guide', NEW.id,
      '📘 New guide on CriderGPT: ' || NEW.title ||
        E'\nRead it free at cridergpt.com/guides/' || NEW.slug ||
        E'\n#FFA #AgEducation #CriderGPT'
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enqueue_seo_guide
  AFTER INSERT ON public.seo_guides
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_marketing_seo_guide();

-- Enqueue on new livestock animal (owner only — so we don't post other users' animals)
CREATE OR REPLACE FUNCTION public.enqueue_marketing_livestock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.system_owners so WHERE so.id = NEW.owner_id AND so.is_active = true) THEN
    INSERT INTO public.marketing_auto_post_queue(source, source_id, caption, media_url)
    VALUES (
      'livestock_animal', NEW.id,
      '🐄 New addition to the Crider herd: ' || coalesce(NEW.name, NEW.animal_id) ||
        coalesce(' (' || NEW.breed || ' ' || NEW.species || ')', '') ||
        E'\nTagged & tracked with CriderGPT Smart Tags 🏷️\n#FFA #Livestock #CriderGPT',
      NEW.photo_url
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enqueue_livestock
  AFTER INSERT ON public.livestock_animals
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_marketing_livestock();
