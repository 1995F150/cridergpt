
-- RPC: inactive users for reminder emails
CREATE OR REPLACE FUNCTION public.get_inactive_users_for_reminder(
  _inactive_since timestamptz,
  _last_reminder_before timestamptz,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  tier text,
  days_away int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    COALESCE(p.display_name, p.username)::text AS display_name,
    COALESCE(p.tier, 'Free')::text AS tier,
    GREATEST(1, EXTRACT(DAY FROM now() - COALESCE(last_act.last_at, u.created_at))::int) AS days_away
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT MAX(created_at) AS last_at
    FROM public.ai_interactions ai
    WHERE ai.user_id = u.id
  ) last_act ON TRUE
  LEFT JOIN LATERAL (
    SELECT MAX(created_at) AS last_at
    FROM public.user_notifications n
    WHERE n.user_id = u.id AND n.type = 'inactive_reminder_email'
  ) last_rem ON TRUE
  WHERE u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND COALESCE(last_act.last_at, u.created_at) < _inactive_since
    AND (last_rem.last_at IS NULL OR last_rem.last_at < _last_reminder_before)
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_inactive_users_for_reminder(timestamptz, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inactive_users_for_reminder(timestamptz, timestamptz, int) TO service_role;

-- Hourly sweeper cron
DO $$ BEGIN
  PERFORM cron.unschedule('email-lifecycle-sweeper-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'email-lifecycle-sweeper-hourly',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url:='https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/email-lifecycle-sweeper',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
