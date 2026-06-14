SELECT cron.unschedule('auto-generate-promo-post-hourly');

SELECT cron.schedule(
  'auto-generate-promo-post-hourly',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/auto-generate-promo-post',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);