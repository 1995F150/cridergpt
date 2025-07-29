-- Fix security issues with mutable search_path for database functions

-- Fix update_conversation_timestamp function
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.chat_conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- Fix update_pro_access function  
CREATE OR REPLACE FUNCTION public.update_pro_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Set pro access based on subscription status
    NEW.pro_access = (
        NEW.stripe_subscription_status IN ('active', 'trialing') AND 
        NEW.current_plan = 'CriderOS Pro'
    );
    
    -- Set subscription dates if not already set
    IF NEW.stripe_subscription_status = 'active' AND NEW.subscription_start_date IS NULL THEN
        NEW.subscription_start_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix can_user_request_tts function
CREATE OR REPLACE FUNCTION public.can_user_request_tts(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- function body
  RETURN true;
END;
$function$;

-- Fix example_function
CREATE OR REPLACE FUNCTION public.example_function(input_value integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    RETURN input_value * 2;
END;
$function$;

-- Fix create_or_update_buyer function
CREATE OR REPLACE FUNCTION public.create_or_update_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Upsert buyer information
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
END;
$function$;

-- Fix update_plus_access function
CREATE OR REPLACE FUNCTION public.update_plus_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    default_plus_features jsonb;
BEGIN
    -- Define default Plus features
    default_plus_features := jsonb_build_object(
        'advanced_analytics', true,
        'priority_support', true,
        'custom_integrations', true,
        'max_projects', 10,
        'api_access_level', 'extended'
    );

    -- Set Plus access based on subscription status
    NEW.plus_access = (
        NEW.plus_subscription_status IN ('active', 'trialing') AND 
        NEW.plus_tier = 'CriderOS Plus'
    );
    
    -- Set default Plus features if not already set
    IF NEW.plus_features IS NULL THEN
        NEW.plus_features = default_plus_features;
    END IF;
    
    -- Set subscription start date
    IF NEW.plus_subscription_status = 'active' AND NEW.plus_subscription_start_date IS NULL THEN
        NEW.plus_subscription_start_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;