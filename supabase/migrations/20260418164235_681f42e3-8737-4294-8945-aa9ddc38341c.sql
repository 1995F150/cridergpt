
-- Enable pg_cron + pg_net for auto-prune
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Feature throttle / kill-switch table
CREATE TABLE IF NOT EXISTS public.feature_throttles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  retention_days integer NOT NULL DEFAULT 30,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.feature_throttles ENABLE ROW LEVEL SECURITY;

-- Anyone authed can read throttle state (so client can hide features)
CREATE POLICY "throttles readable by authenticated"
  ON public.feature_throttles FOR SELECT
  TO authenticated USING (true);

-- Only admins can change throttles
CREATE POLICY "admins manage throttles"
  ON public.feature_throttles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: is a feature currently enabled?
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT enabled FROM public.feature_throttles WHERE feature_key = _key), true)
$$;

-- Seed the heavy-write features
INSERT INTO public.feature_throttles (feature_key, enabled, retention_days, description) VALUES
  ('ai_memory_writes',     true, 60, 'Persist AI memory entries (largest table ~354MB)'),
  ('vision_memory_writes', false, 30, 'Persist vision/image memory (was 334MB bloat)'),
  ('chat_history_persist', true, 30, 'Save chat messages to DB'),
  ('media_generations_persist', true, 30, 'Save generated media records'),
  ('ai_interactions_log',  true, 30, 'Log every AI interaction'),
  ('ai_feedback_log',      true, 60, 'Save AI feedback rows'),
  ('scan_logs',            true, 90, 'Livestock scan logs'),
  ('agent_swarm_logs',     true, 14, 'Agent swarm task history')
ON CONFLICT (feature_key) DO NOTHING;

-- Auto-prune function: deletes rows older than each table's retention_days
CREATE OR REPLACE FUNCTION public.run_data_autoprune()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  r integer;
  d_ai_memory int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='ai_memory_writes'), 60);
  d_vision    int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='vision_memory_writes'), 30);
  d_chat      int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='chat_history_persist'), 30);
  d_media     int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='media_generations_persist'), 30);
  d_inter     int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='ai_interactions_log'), 30);
  d_feedback  int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='ai_feedback_log'), 60);
  d_scan      int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='scan_logs'), 90);
  d_swarm     int      := COALESCE((SELECT retention_days FROM feature_throttles WHERE feature_key='agent_swarm_logs'), 14);
BEGIN
  DELETE FROM ai_memory          WHERE created_at < now() - (d_ai_memory || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('ai_memory', r);
  DELETE FROM vision_memory      WHERE created_at < now() - (d_vision   || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('vision_memory', r);
  DELETE FROM chat_messages      WHERE created_at < now() - (d_chat     || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('chat_messages', r);
  DELETE FROM media_generations  WHERE created_at < now() - (d_media    || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('media_generations', r);
  DELETE FROM ai_interactions    WHERE created_at < now() - (d_inter    || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('ai_interactions', r);
  DELETE FROM ai_feedback        WHERE created_at < now() - (d_feedback || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('ai_feedback', r);
  DELETE FROM livestock_scan_logs WHERE scanned_at < now() - (d_scan    || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('livestock_scan_logs', r);
  DELETE FROM agent_swarm_tasks  WHERE created_at < now() - (d_swarm    || ' days')::interval; GET DIAGNOSTICS r = ROW_COUNT; result := result || jsonb_build_object('agent_swarm_tasks', r);
  RETURN result;
END
$$;

-- Allow admins to manually trigger autoprune
REVOKE ALL ON FUNCTION public.run_data_autoprune() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_data_autoprune() TO authenticated;

-- Schedule daily auto-prune at 3:30 AM UTC
SELECT cron.unschedule('cridergpt-daily-autoprune') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='cridergpt-daily-autoprune');
SELECT cron.schedule('cridergpt-daily-autoprune', '30 3 * * *', $$SELECT public.run_data_autoprune();$$);
