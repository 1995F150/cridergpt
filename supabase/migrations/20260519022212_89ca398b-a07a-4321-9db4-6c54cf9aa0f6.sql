
-- PC ingest tokens (hashed)
CREATE TABLE public.pc_ingest_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_ingest_tokens_user ON public.pc_ingest_tokens(user_id);

ALTER TABLE public.pc_ingest_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tokens" ON public.pc_ingest_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own tokens" ON public.pc_ingest_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users revoke own tokens" ON public.pc_ingest_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tokens" ON public.pc_ingest_tokens FOR DELETE USING (auth.uid() = user_id);

-- PC → backend events
CREATE TABLE public.pc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_events_user_time ON public.pc_events(user_id, created_at DESC);

ALTER TABLE public.pc_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own events" ON public.pc_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.pc_events FOR DELETE USING (auth.uid() = user_id);

-- Backend → PC outbox (draft / future)
CREATE TABLE public.pc_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_outbox_user_status ON public.pc_outbox(user_id, status);

ALTER TABLE public.pc_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own outbox" ON public.pc_outbox FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own outbox" ON public.pc_outbox FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own outbox" ON public.pc_outbox FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own outbox" ON public.pc_outbox FOR DELETE USING (auth.uid() = user_id);
