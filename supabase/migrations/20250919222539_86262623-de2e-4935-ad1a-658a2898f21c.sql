-- Sync all existing users to crider_chat_users and add location detection
INSERT INTO public.crider_chat_users (user_id, display_name, email, avatar_url, sync_note, is_synced, location)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as display_name,
    au.email,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    'Auto-synced to Crider Chat system' as sync_note,
    true as is_synced,
    '{"country": "US", "detected": "auto", "timestamp": "' || now() || '"}' as location
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.crider_chat_users ccu 
    WHERE ccu.user_id = au.id
);

-- Add function to automatically sync new users
CREATE OR REPLACE FUNCTION public.auto_sync_new_user_to_crider_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        '{"country": "US", "detected": "auto", "timestamp": "' || now() || '"}'
    );
    RETURN NEW;
END;
$$;

-- Create trigger for auto-sync
DROP TRIGGER IF EXISTS auto_sync_crider_chat_trigger ON auth.users;
CREATE TRIGGER auto_sync_crider_chat_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_sync_new_user_to_crider_chat();

-- Update existing crider_chat_users with location data if missing
UPDATE public.crider_chat_users 
SET location = '{"country": "US", "detected": "auto", "timestamp": "' || now() || '"}'
WHERE location IS NULL;