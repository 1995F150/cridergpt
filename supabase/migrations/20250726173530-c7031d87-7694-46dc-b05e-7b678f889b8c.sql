-- Create a system user for Jessie (founder messages)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'jessie@crideros.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create system profile for Jessie
INSERT INTO public.profiles (id, user_id, username, tier)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'jessie_founder', 'founder')
ON CONFLICT (id) DO NOTHING;

-- Function to send welcome message to new users
CREATE OR REPLACE FUNCTION send_welcome_message_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    welcome_message TEXT;
    conversation_id UUID;
    jessie_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Extract first name from metadata or use a default
    user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'there');
    
    -- Create the personalized welcome message
    welcome_message := 'Hey ' || user_first_name || '! 👋
Welcome to CriderOS. I''m Jessie, the creator. You''ve got early access, so try out all the features and let me know if you have any questions or ideas!

I appreciate you checking it out. DM me any feedback or just say hey—always happy to help!

– Jessie (CriderOS Founder)';

    -- Create a new conversation between Jessie and the new user
    INSERT INTO public.chat_conversations (id, user_id, title, created_at, updated_at)
    VALUES (gen_random_uuid(), NEW.id, 'Welcome to CriderOS', now(), now())
    RETURNING id INTO conversation_id;

    -- Send the welcome message from Jessie
    INSERT INTO public.chat_messages (conversation_id, user_id, role, content, created_at)
    VALUES (conversation_id, NEW.id, 'assistant', welcome_message, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically send welcome message on user signup
DROP TRIGGER IF EXISTS on_auth_user_signup_welcome ON auth.users;
CREATE TRIGGER on_auth_user_signup_welcome
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION send_welcome_message_to_new_user();