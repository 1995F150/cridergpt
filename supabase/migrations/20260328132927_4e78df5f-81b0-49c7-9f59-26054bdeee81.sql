-- Fix signup trigger stability and livestock pool reset on animal delete

-- 1) Make buyer sync non-blocking during auth signup
CREATE OR REPLACE FUNCTION public.create_or_update_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.buyers (
      id,
      full_name,
      email,
      phone
  ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      NEW.phone
  )
  ON CONFLICT (id) DO UPDATE
  SET
      full_name = COALESCE(EXCLUDED.full_name, buyers.full_name),
      email = COALESCE(EXCLUDED.email, buyers.email),
      phone = COALESCE(EXCLUDED.phone, buyers.phone),
      updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_or_update_buyer failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 2) Make profile/subscription initialization resilient and fix invalid sync_status value
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_features jsonb;
BEGIN
  default_features := jsonb_build_object(
    'system_updates_access', true,
    'community_support', true,
    'basic_mod_creation', true
  );

  BEGIN
    INSERT INTO public.profiles (
      user_id,
      tier,
      plus_access,
      pro_access,
      tier_features,
      chat_tokens_limit,
      tts_limit,
      max_projects,
      max_api_keys,
      file_upload_mb_limit
    ) VALUES (
      NEW.id,
      'free',
      false,
      false,
      ARRAY['System Updates Access', 'Community Support'],
      100,
      5,
      1,
      2,
      10
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'initialize_new_user profiles insert failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  END;

  BEGIN
    INSERT INTO public.ai_usage (
      user_id,
      email,
      user_plan,
      tokens_used,
      tts_requests
    ) VALUES (
      NEW.id,
      NEW.email,
      'free',
      0,
      0
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'initialize_new_user ai_usage insert failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  END;

  BEGIN
    INSERT INTO public.platform_subscriptions (
      user_id,
      email,
      plan_name,
      platform_name,
      sync_status,
      features_unlocked
    ) VALUES (
      NEW.id,
      NEW.email,
      'free',
      'cridergpt',
      'synced',
      default_features
    ) ON CONFLICT (user_id, platform_name) DO NOTHING;

    INSERT INTO public.platform_subscriptions (
      user_id,
      email,
      plan_name,
      platform_name,
      sync_status,
      features_unlocked
    ) VALUES (
      NEW.id,
      NEW.email,
      'free',
      'farming_simulator_mod_maker',
      'synced',
      default_features
    ) ON CONFLICT (user_id, platform_name) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'initialize_new_user platform_subscriptions insert failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  END;

  BEGIN
    INSERT INTO public.user_roles (
      user_id,
      role
    ) VALUES (
      NEW.id,
      'user'
    ) ON CONFLICT (user_id, role) DO NOTHING;

    IF NEW.email = 'jessiecrider3@gmail.com' THEN
      INSERT INTO public.user_roles (
        user_id,
        role
      ) VALUES (
        NEW.id,
        'admin'
      ) ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'initialize_new_user user_roles insert failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- 3) Make welcome message trigger non-blocking
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_first_name TEXT;
  welcome_message TEXT;
  conversation_id UUID;
BEGIN
  user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'there');

  welcome_message := 'Hey ' || user_first_name || '! 👋
Welcome to CriderOS. I''m Jessie, the creator. You''ve got early access, so try out all the features and let me know if you have any questions or ideas!

I appreciate you checking it out. DM me any feedback or just say hey—always happy to help!

– Jessie (CriderOS Founder)';

  INSERT INTO public.chat_conversations (id, user_id, title, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, 'Welcome to CriderOS', now(), now())
  RETURNING id INTO conversation_id;

  INSERT INTO public.chat_messages (conversation_id, user_id, role, content, created_at)
  VALUES (conversation_id, NEW.id, 'assistant', welcome_message, now());

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_welcome_message_to_new_user failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 4) Make chat sync trigger non-blocking
CREATE OR REPLACE FUNCTION public.auto_sync_new_user_to_crider_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.crider_chat_users (
      user_id,
      display_name,
      email,
      avatar_url,
      sync_note,
      is_synced,
      location
  ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url',
      'Auto-synced on account creation',
      true,
      ('{"country": "US", "detected": "auto", "timestamp": "' || now() || '"}')::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_sync_new_user_to_crider_chat failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 5) Reset livestock tag pool entry whenever an animal is deleted
CREATE OR REPLACE FUNCTION public.reset_livestock_pool_on_animal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.livestock_tag_pool
  SET
    status = 'available',
    assigned_to_animal = NULL,
    assigned_by = NULL,
    assigned_at = NULL
  WHERE tag_id = OLD.tag_id
     OR assigned_to_animal = OLD.id;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reset_pool_on_livestock_delete ON public.livestock_animals;
CREATE TRIGGER trg_reset_pool_on_livestock_delete
AFTER DELETE ON public.livestock_animals
FOR EACH ROW
EXECUTE FUNCTION public.reset_livestock_pool_on_animal_delete();