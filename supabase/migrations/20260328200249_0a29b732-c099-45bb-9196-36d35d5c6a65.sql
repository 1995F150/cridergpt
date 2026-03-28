
-- Fix the profile creation trigger that crashes signup
-- The current function references 'updated_at' which doesn't exist in profiles table
-- AND it has no exception handler, so it kills the entire auth signup

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_profile failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Also fix the crider_chat_users sync - table doesn't exist, 
-- but let's make the function a no-op safely
CREATE OR REPLACE FUNCTION public.auto_sync_new_user_to_crider_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Table crider_chat_users no longer exists, skip gracefully
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_sync_new_user_to_crider_chat failed for user %: % (%). Continuing signup.', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
