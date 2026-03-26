
-- Fix 1: Add unique constraint on ai_usage.user_id so ON CONFLICT works in signup trigger
DELETE FROM public.ai_usage a
USING public.ai_usage b
WHERE a.user_id = b.user_id
  AND a.id > b.id;

ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_user_id_unique UNIQUE (user_id);

-- Fix 2: Drop the duplicate trigger (both call initialize_new_user)
DROP TRIGGER IF EXISTS comprehensive_user_init ON auth.users;

-- Fix 3: Update plan_configurations with correct pricing ($3/$7/$30)
UPDATE public.plan_configurations
SET price_monthly = 3.00,
    plan_display_name = 'CriderGPT Plus',
    features = '["100 messages/day", "100 TTS requests/day", "GPT-4o Mini model", "Priority support", "File upload (50MB)", "5 projects", "Backend code generator"]'::jsonb
WHERE plan_name = 'plus';

UPDATE public.plan_configurations
SET price_monthly = 7.00,
    plan_display_name = 'CriderGPT Pro',
    features = '["500 messages/day", "Unlimited TTS", "GPT-4o model", "Priority support", "Advanced analytics", "File upload (100MB)", "10 projects", "Mod deployment", "Automation tools"]'::jsonb
WHERE plan_name = 'pro';

UPDATE public.plan_configurations
SET price_monthly = 30.00,
    plan_display_name = 'CriderGPT Lifetime Founder',
    features = '["Unlimited messages forever", "Unlimited TTS forever", "GPT-4o model", "All current & future features", "Unlimited projects", "Founder badge", "No monthly fees ever"]'::jsonb
WHERE plan_name = 'lifetime';
