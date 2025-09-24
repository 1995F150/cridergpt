-- Update record_usage function to handle documents and calculators
CREATE OR REPLACE FUNCTION public.record_usage(user_uuid uuid, request_type text, amount_used integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update usage counters
  UPDATE public.usage_controls
  SET 
    daily_tokens_used = CASE WHEN request_type = 'tokens' THEN daily_tokens_used + amount_used ELSE daily_tokens_used END,
    daily_tts_used = CASE WHEN request_type = 'tts' THEN daily_tts_used + amount_used ELSE daily_tts_used END,
    daily_images_used = CASE WHEN request_type = 'images' THEN daily_images_used + amount_used ELSE daily_images_used END,
    daily_docs_used = CASE WHEN request_type = 'documents' THEN daily_docs_used + amount_used ELSE daily_docs_used END,
    daily_calculator_used = CASE WHEN request_type = 'calculators' THEN COALESCE(daily_calculator_used, 0) + amount_used ELSE COALESCE(daily_calculator_used, 0) END,
    daily_document_used = CASE WHEN request_type = 'documents' THEN COALESCE(daily_document_used, 0) + amount_used ELSE COALESCE(daily_document_used, 0) END,
    current_minute_requests = current_minute_requests + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  RETURN true;
END;
$$;