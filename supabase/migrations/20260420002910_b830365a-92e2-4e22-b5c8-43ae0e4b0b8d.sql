-- ============================================================
-- Hybrid Supabase + Local Ubuntu Worker: jobs queue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.worker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  worker_name TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  priority INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT worker_jobs_status_check CHECK (status IN ('pending','processing','complete','failed','retry'))
);

CREATE INDEX IF NOT EXISTS idx_worker_jobs_status_sched
  ON public.worker_jobs (status, scheduled_for, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_type ON public.worker_jobs (type);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_created_by ON public.worker_jobs (created_by);

ALTER TABLE public.worker_jobs ENABLE ROW LEVEL SECURITY;

-- Owners (creators) can view their own jobs
CREATE POLICY "Users view own jobs"
  ON public.worker_jobs FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users insert own jobs"
  ON public.worker_jobs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Workers connect with the service role key, which bypasses RLS automatically.
-- No anon UPDATE/DELETE policy on purpose.

-- ============================================================
-- Worker heartbeat / registry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.worker_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT NOT NULL UNIQUE,
  hostname TEXT,
  version TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  jobs_processed INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_nodes_heartbeat ON public.worker_nodes (last_heartbeat DESC);
ALTER TABLE public.worker_nodes ENABLE ROW LEVEL SECURITY;
-- Read-only to authenticated users; workers write via service role.
CREATE POLICY "Authenticated can view workers"
  ON public.worker_nodes FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Atomic claim function — prevents two workers grabbing the same job
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_next_worker_job(
  p_worker_name TEXT,
  p_types TEXT[] DEFAULT NULL
)
RETURNS SETOF public.worker_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.worker_jobs;
BEGIN
  SELECT * INTO v_job
  FROM public.worker_jobs
  WHERE status = 'pending'
    AND scheduled_for <= now()
    AND (p_types IS NULL OR type = ANY(p_types))
  ORDER BY priority DESC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.worker_jobs
  SET status = 'processing',
      worker_name = p_worker_name,
      started_at = now(),
      attempts = attempts + 1
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  RETURN NEXT v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_worker_job(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_next_worker_job(TEXT, TEXT[]) TO service_role;