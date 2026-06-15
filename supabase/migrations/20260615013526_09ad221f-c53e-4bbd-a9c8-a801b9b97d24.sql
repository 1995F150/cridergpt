
CREATE OR REPLACE FUNCTION public.get_user_entitlement(_user_id uuid)
RETURNS TABLE(plan text, is_active boolean, source text, expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_map jsonb := '{"free":0,"plus":1,"plu":1,"pro":2,"lifetime":3}'::jsonb;
  best_plan text := 'free';
  best_rank int := 0;
  best_source text := 'default';
  best_expires timestamptz := NULL;
  r record;
BEGIN
  -- 1. Lifetime from profiles
  SELECT tier, NULL::timestamptz INTO r.plan_name, r.expires_at
  FROM public.profiles WHERE user_id = _user_id AND (tier = 'lifetime' OR lifetime_access = true) LIMIT 1;
  IF FOUND THEN
    best_plan := 'lifetime'; best_rank := 3; best_source := 'profile_lifetime';
  END IF;

  -- 2. Stripe / web: user_subscriptions active
  FOR r IN
    SELECT plan_name, subscription_end_date AS expires_at
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND plan_status IN ('active','trialing')
      AND (subscription_end_date IS NULL OR subscription_end_date > now())
  LOOP
    IF COALESCE((rank_map->>r.plan_name)::int, 0) > best_rank THEN
      best_rank := (rank_map->>r.plan_name)::int;
      best_plan := r.plan_name; best_source := 'stripe_web'; best_expires := r.expires_at;
    END IF;
  END LOOP;

  -- 3. Native IAP via platform_subscriptions
  FOR r IN
    SELECT plan_name, platform_name, NULL::timestamptz AS expires_at
    FROM public.platform_subscriptions
    WHERE user_id = _user_id AND sync_status = 'active'
  LOOP
    IF COALESCE((rank_map->>r.plan_name)::int, 0) > best_rank THEN
      best_rank := (rank_map->>r.plan_name)::int;
      best_plan := r.plan_name; best_source := COALESCE(r.platform_name, 'native_iap');
    END IF;
  END LOOP;

  -- 4. Raw iap_purchases fallback (verified + not expired)
  FOR r IN
    SELECT product_id, platform, expires_at
    FROM public.iap_purchases
    WHERE user_id = _user_id
      AND status IN ('verified','active')
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    DECLARE
      derived text := CASE
        WHEN r.product_id ILIKE '%pro%' THEN 'pro'
        WHEN r.product_id ILIKE '%plus%' THEN 'plus'
        WHEN r.product_id ILIKE '%lifetime%' THEN 'lifetime'
        ELSE 'free'
      END;
    BEGIN
      IF COALESCE((rank_map->>derived)::int, 0) > best_rank THEN
        best_rank := (rank_map->>derived)::int;
        best_plan := derived; best_source := 'iap_' || r.platform; best_expires := r.expires_at;
      END IF;
    END;
  END LOOP;

  -- 5. Legacy ai_usage.user_plan as last resort
  IF best_rank = 0 THEN
    SELECT user_plan INTO best_plan FROM public.ai_usage WHERE user_id = _user_id LIMIT 1;
    IF best_plan IS NULL THEN best_plan := 'free'; END IF;
    best_source := 'ai_usage_legacy';
  END IF;

  RETURN QUERY SELECT best_plan, best_plan <> 'free', best_source, best_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_entitlement(uuid) TO authenticated, service_role;
