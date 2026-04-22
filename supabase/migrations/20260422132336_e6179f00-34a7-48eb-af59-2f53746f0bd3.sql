-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to delete ai_interactions older than 2 hours
CREATE OR REPLACE FUNCTION public.purge_old_ai_interactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_interactions
  WHERE created_at < (now() - interval '2 hours');
END;
$$;

-- Schedule the purge to run every 30 minutes (rolling 2hr window)
SELECT cron.schedule(
  'purge-ai-interactions-2hr',
  '*/30 * * * *',
  $$ SELECT public.purge_old_ai_interactions(); $$
);