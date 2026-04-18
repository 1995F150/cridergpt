-- Enable required extensions for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cleanup function: removes chat messages, conversations, and AI interactions older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete chat messages older than 24 hours
  DELETE FROM public.chat_messages WHERE created_at < now() - interval '24 hours';
  
  -- Delete empty/old conversations older than 24 hours
  DELETE FROM public.chat_conversations WHERE updated_at < now() - interval '24 hours';
  
  -- Delete AI interactions older than 24 hours
  DELETE FROM public.ai_interactions WHERE created_at < now() - interval '24 hours';
  
  -- Delete imported messages older than 24 hours
  DELETE FROM public.imported_messages WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Schedule the cleanup to run every hour
SELECT cron.schedule(
  'cleanup-old-data-hourly',
  '0 * * * *',
  $$ SELECT public.cleanup_old_data(); $$
);