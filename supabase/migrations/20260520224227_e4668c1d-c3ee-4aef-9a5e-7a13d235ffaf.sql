
CREATE TABLE IF NOT EXISTS public.dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result TEXT,
  error TEXT,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  priority INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_tasks_status_priority ON public.dev_tasks(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_user ON public.dev_tasks(user_id, created_at DESC);

ALTER TABLE public.dev_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own dev tasks"
ON public.dev_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own dev tasks"
ON public.dev_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own dev tasks"
ON public.dev_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own dev tasks"
ON public.dev_tasks FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_dev_tasks_updated_at
BEFORE UPDATE ON public.dev_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dev_tasks;
ALTER TABLE public.dev_tasks REPLICA IDENTITY FULL;
