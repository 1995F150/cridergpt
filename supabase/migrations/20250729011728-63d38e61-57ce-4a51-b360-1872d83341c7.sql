-- Fix remaining functions with mutable search_path security issues

-- Fix all remaining functions to have secure search_path
CREATE OR REPLACE FUNCTION public.check_plus_access(feature text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    user_plus_access boolean;
    user_plus_features jsonb;
BEGIN
    -- Retrieve Plus access and features for the current user
    SELECT 
        COALESCE(plus_access, false),
        COALESCE(plus_features, '{}'::jsonb)
    INTO 
        user_plus_access,
        user_plus_features
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If no specific feature is requested, return overall Plus access
    IF feature IS NULL THEN
        RETURN user_plus_access;
    END IF;
    
    -- Check specific feature access
    RETURN user_plus_access AND 
           (user_plus_features->feature)::boolean;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_plus_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Rest of your function logic here
    -- Use fully qualified schema.table references
    -- Example: SELECT ... FROM public.some_table
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  is_subscribed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
    AND s.status = 'active'
  ) INTO is_subscribed;
  
  RETURN COALESCE(is_subscribed, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_stripe_customer_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  customer_id text;
BEGIN
  SELECT c.stripe_customer_id INTO customer_id
  FROM public.customers c
  WHERE c.user_id = auth.uid();
  
  RETURN customer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS TABLE(subscription_id text, product_name text, price_id text, status text, current_period_end timestamp with time zone, cancel_at_period_end boolean, amount integer, currency text, interval_value text, interval_count integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.stripe_subscription_id as subscription_id,
    pr.name as product_name,
    p.stripe_price_id as price_id,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    p.unit_amount as amount,
    p.currency,
    p.interval as interval_value,  -- Aliased as interval_value
    p.interval_count
  FROM 
    public.subscriptions s
  JOIN 
    public.prices p ON s.price_id = p.stripe_price_id
  JOIN 
    public.products pr ON p.product_id = pr.id
  WHERE 
    s.user_id = auth.uid()
  ORDER BY 
    s.created_at DESC
  LIMIT 1;
END;
$function$;

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
    -- Extract first name from metadata or use a default
    user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'there');
    
    -- Create the personalized welcome message
    welcome_message := 'Hey ' || user_first_name || '! 👋
Welcome to CriderOS. I''m Jessie, the creator. You''ve got early access, so try out all the features and let me know if you have any questions or ideas!

I appreciate you checking it out. DM me any feedback or just say hey—always happy to help!

– Jessie (CriderOS Founder)';

    -- Create a new conversation for the new user with a welcome message
    INSERT INTO public.chat_conversations (id, user_id, title, created_at, updated_at)
    VALUES (gen_random_uuid(), NEW.id, 'Welcome to CriderOS', now(), now())
    RETURNING id INTO conversation_id;

    -- Send the welcome message 
    INSERT INTO public.chat_messages (conversation_id, user_id, role, content, created_at)
    VALUES (conversation_id, NEW.id, 'assistant', welcome_message, now());

    RETURN NEW;
END;
$function$;