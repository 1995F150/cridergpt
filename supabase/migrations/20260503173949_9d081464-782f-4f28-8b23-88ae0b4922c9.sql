
-- Passphrases (owner secret words/phrases)
CREATE TABLE public.owner_passphrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  passphrase_hash text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('unlock_dev','switch_mode','secret_command','verify_action')),
  payload jsonb DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_passphrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own passphrases" ON public.owner_passphrases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own passphrases" ON public.owner_passphrases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own passphrases" ON public.owner_passphrases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own passphrases" ON public.owner_passphrases FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_passphrases_updated BEFORE UPDATE ON public.owner_passphrases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Share-to-unlock
CREATE TABLE public.share_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  share_platform text,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key)
);
ALTER TABLE public.share_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own unlocks" ON public.share_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own unlocks" ON public.share_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs select" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs insert" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs update" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs delete" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Digest preferences
CREATE TABLE public.digest_preferences (
  user_id uuid PRIMARY KEY,
  weekly_enabled boolean NOT NULL DEFAULT true,
  day_of_week int NOT NULL DEFAULT 0 CHECK (day_of_week BETWEEN 0 AND 6),
  last_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digest_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own digest" ON public.digest_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own digest" ON public.digest_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own digest" ON public.digest_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_digest_updated BEFORE UPDATE ON public.digest_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chapter officers
CREATE TABLE public.chapter_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL,
  user_id uuid NOT NULL,
  office text NOT NULL CHECK (office IN ('president','vice_president','secretary','treasurer','reporter','sentinel','historian','advisor')),
  term_year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, office, term_year)
);
ALTER TABLE public.chapter_officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view officers" ON public.chapter_officers FOR SELECT USING (true);
CREATE POLICY "Owner manages officers insert" ON public.chapter_officers FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner manages officers update" ON public.chapter_officers FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner manages officers delete" ON public.chapter_officers FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- SEO guides
CREATE TABLE public.seo_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  meta_description text,
  published boolean NOT NULL DEFAULT true,
  view_count int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published guides" ON public.seo_guides FOR SELECT USING (published = true);
CREATE POLICY "Admin manages guides insert" ON public.seo_guides FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages guides update" ON public.seo_guides FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages guides delete" ON public.seo_guides FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_guides_updated BEFORE UPDATE ON public.seo_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_seo_guides_category ON public.seo_guides(category) WHERE published = true;
