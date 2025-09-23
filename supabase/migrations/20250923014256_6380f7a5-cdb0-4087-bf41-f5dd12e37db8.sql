-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'anon')
);

CREATE POLICY "Public access to documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Update can_user_make_request function to handle documents
CREATE OR REPLACE FUNCTION public.can_user_make_request(user_uuid uuid, request_type text DEFAULT 'tokens'::text, requested_amount integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_controls public.usage_controls%ROWTYPE;
  user_plan public.plan_configurations%ROWTYPE;
  current_limit integer;
  current_usage integer;
  can_proceed boolean := false;
  reason text := 'Unknown error';
  rate_limit_ok boolean := true;
BEGIN
  -- Get or create user controls
  SELECT * INTO user_controls
  FROM public.usage_controls
  WHERE user_id = user_uuid;
  
  -- If no controls exist, create them
  IF user_controls.id IS NULL THEN
    -- Get user's current plan
    SELECT pc.* INTO user_plan
    FROM public.profiles p
    JOIN public.plan_configurations pc ON pc.plan_name = COALESCE(p.tier, 'free')
    WHERE p.user_id = user_uuid AND pc.is_active = true;
    
    -- Create controls with plan limits
    INSERT INTO public.usage_controls (
      user_id,
      plan_name,
      daily_tokens_limit,
      daily_tts_limit,
      daily_image_gen_limit,
      daily_doc_analysis_limit,
      daily_calculator_limit,
      daily_document_limit,
      requests_per_minute_limit
    ) VALUES (
      user_uuid,
      COALESCE(user_plan.plan_name, 'free'),
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 13
        WHEN user_plan.plan_name = 'plus' THEN 200
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 13
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 5
        WHEN user_plan.plan_name = 'plus' THEN 100
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 5
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 0
        WHEN user_plan.plan_name = 'plus' THEN 10
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 0
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 0
        WHEN user_plan.plan_name = 'plus' THEN 20
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 0
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 5
        WHEN user_plan.plan_name = 'plus' THEN 25
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 5
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 2
        WHEN user_plan.plan_name = 'plus' THEN 10
        WHEN user_plan.plan_name = 'pro' THEN 10000
        ELSE 2
      END,
      CASE 
        WHEN user_plan.plan_name = 'free' THEN 5
        WHEN user_plan.plan_name = 'plus' THEN 15
        WHEN user_plan.plan_name = 'pro' THEN 100
        ELSE 5
      END
    )
    RETURNING * INTO user_controls;
  END IF;
  
  -- Reset daily usage if new day
  IF user_controls.last_reset_date < CURRENT_DATE THEN
    UPDATE public.usage_controls
    SET 
      daily_tokens_used = 0,
      daily_tts_used = 0,
      daily_images_used = 0,
      daily_docs_used = 0,
      daily_calculator_used = 0,
      daily_document_used = 0,
      last_reset_date = CURRENT_DATE,
      current_minute_requests = 0,
      last_minute_reset = now()
    WHERE user_id = user_uuid;
    
    -- Refresh the record
    SELECT * INTO user_controls
    FROM public.usage_controls
    WHERE user_id = user_uuid;
  END IF;
  
  -- Check rate limiting (per minute)
  IF user_controls.last_minute_reset < (now() - interval '1 minute') THEN
    UPDATE public.usage_controls
    SET 
      current_minute_requests = 0,
      last_minute_reset = now()
    WHERE user_id = user_uuid;
    user_controls.current_minute_requests := 0;
  END IF;
  
  -- Check rate limit
  IF user_controls.current_minute_requests >= user_controls.requests_per_minute_limit THEN
    rate_limit_ok := false;
  END IF;
  
  -- Check if suspended
  IF user_controls.is_suspended THEN
    reason := COALESCE(user_controls.suspension_reason, 'Account suspended');
    can_proceed := false;
  ELSIF NOT rate_limit_ok THEN
    reason := 'Rate limit exceeded - too many requests per minute';
    can_proceed := false;
  ELSE
    -- Check specific request type limits
    CASE request_type
      WHEN 'tokens' THEN
        current_limit := user_controls.daily_tokens_limit;
        current_usage := user_controls.daily_tokens_used;
      WHEN 'tts' THEN
        current_limit := user_controls.daily_tts_limit;
        current_usage := user_controls.daily_tts_used;
      WHEN 'images' THEN
        current_limit := user_controls.daily_image_gen_limit;
        current_usage := user_controls.daily_images_used;
      WHEN 'documents' THEN
        current_limit := COALESCE(user_controls.daily_document_limit, 2);
        current_usage := COALESCE(user_controls.daily_document_used, 0);
      WHEN 'calculators' THEN
        current_limit := COALESCE(user_controls.daily_calculator_limit, 5);
        current_usage := COALESCE(user_controls.daily_calculator_used, 0);
      ELSE
        current_limit := 0;
        current_usage := 999999;
    END CASE;
    
    -- Check if request would exceed limit
    IF (current_usage + requested_amount) <= current_limit THEN
      can_proceed := true;
      reason := 'Request approved';
    ELSE
      can_proceed := false;
      reason := format('You''ve reached your current plan''s %s limit. Upgrade to Plus or Pro for more access.', request_type);
    END IF;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'can_proceed', can_proceed,
    'reason', reason,
    'current_usage', current_usage,
    'daily_limit', current_limit,
    'requests_this_minute', user_controls.current_minute_requests,
    'rate_limit', user_controls.requests_per_minute_limit,
    'plan', user_controls.plan_name,
    'is_suspended', user_controls.is_suspended
  );
END;
$$;