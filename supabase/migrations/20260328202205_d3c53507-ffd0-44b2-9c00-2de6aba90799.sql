-- Fix OAuth callback 500 caused by search_path mutation during auth user creation
-- Root cause from postgres logs:
-- UPDATE "users" AS users SET ... failed with 42P01 under supabase_auth_admin
-- because update_crideros_tier() set search_path to '' inside a trigger chain.

CREATE OR REPLACE FUNCTION public.update_crideros_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Intentionally no-op for now; keep data unchanged.
  -- IMPORTANT: never mutate session search_path here.
  RETURN NEW;
END;
$function$;

-- Fix noisy signup warning path in ai_usage trigger function (up.email column does not exist)
CREATE OR REPLACE FUNCTION public.sync_platform_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.platform_subscriptions (
      user_id,
      email,
      plan_name,
      platform_name,
      sync_status,
      features_unlocked,
      updated_at
  )
  VALUES (
      NEW.user_id,
      COALESCE(NEW.email, 'unknown@example.com'),
      COALESCE(NEW.user_plan, 'free'),
      'cridergpt',
      'pending',
      CASE 
        WHEN NEW.user_plan = 'plus' THEN jsonb_build_object(
          'farmer_simulator_plus', true,
          'advanced_analytics', true,
          'priority_support', true
        )
        WHEN NEW.user_plan = 'pro' THEN jsonb_build_object(
          'farmer_simulator_pro', true,
          'farmer_simulator_plus', true,
          'advanced_analytics', true,
          'priority_support', true,
          'custom_integrations', true,
          'unlimited_features', true
        )
        ELSE '{}'::jsonb
      END,
      now()
  )
  ON CONFLICT (user_id, platform_name)
  DO UPDATE SET
      plan_name = EXCLUDED.plan_name,
      email = EXCLUDED.email,
      features_unlocked = EXCLUDED.features_unlocked,
      sync_status = 'pending',
      updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_platform_subscription failed for user %: % (%). Continuing.', NEW.user_id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;