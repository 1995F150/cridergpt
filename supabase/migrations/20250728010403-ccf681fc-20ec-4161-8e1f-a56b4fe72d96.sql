-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the sync function to run every hour
SELECT cron.schedule(
  'auto-sync-users-to-sheets',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/sync-buyers-to-sheets',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"}'::jsonb,
        body:='{"auto_sync": true}'::jsonb
    ) as request_id;
  $$
);