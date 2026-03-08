CREATE TABLE public.tiktok_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  tiktok_user_id text,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.tiktok_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tiktok tokens"
  ON public.tiktok_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tiktok tokens"
  ON public.tiktok_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tiktok tokens"
  ON public.tiktok_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tiktok tokens"
  ON public.tiktok_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tiktok_tokens_updated_at
  BEFORE UPDATE ON public.tiktok_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();