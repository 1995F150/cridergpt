
-- 1. Referral codes (one per user)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  reward_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read referral codes" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Users manage own referral code" ON public.referral_codes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Referrals tracking (who invited whom)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL UNIQUE,
  code_used TEXT NOT NULL,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  invitee_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inviter and invitee can read their referrals" ON public.referrals FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 3. Streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in DATE,
  total_check_ins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read streak counts" ON public.user_streaks FOR SELECT USING (true);
CREATE POLICY "Users manage own streak" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Chapter activity for the leaderboard (aggregated)
CREATE TABLE IF NOT EXISTS public.chapter_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL UNIQUE,
  chapter_name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  active_members_30d INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chapter_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chapter leaderboard" ON public.chapter_activity FOR SELECT USING (true);

-- 5. Add public profile fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 6. Public profile read policy (only for users who opted in)
DROP POLICY IF EXISTS "Public profiles readable by anyone" ON public.profiles;
CREATE POLICY "Public profiles readable by anyone" ON public.profiles FOR SELECT USING (public_profile_enabled = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON public.referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_activity_score ON public.chapter_activity(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username_public ON public.profiles(username) WHERE public_profile_enabled = true;
