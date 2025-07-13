-- Migrate historical TTS and token usage data to unified ai_usage table

-- First, let's add tts_requests column if it doesn't exist
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS tts_requests INTEGER DEFAULT 0;

-- Update existing ai_usage records with historical TTS data from text_to_speech_requests
UPDATE public.ai_usage 
SET tts_requests = COALESCE((
  SELECT COUNT(*) 
  FROM public.text_to_speech_requests tts 
  WHERE tts.user_id = ai_usage.user_id
    AND date_trunc('month', tts.created_at) = date_trunc('month', COALESCE(ai_usage.last_reset, ai_usage.created_at))
), 0)
WHERE user_id IS NOT NULL;

-- Update existing ai_usage records with historical token data from openai_requests
UPDATE public.ai_usage 
SET tokens_used = COALESCE((
  SELECT COALESCE(SUM(tokens_used), 0)
  FROM public.openai_requests oai 
  WHERE oai.user_id = ai_usage.user_id
    AND date_trunc('month', oai.created_at) = date_trunc('month', COALESCE(ai_usage.last_reset, ai_usage.created_at))
), ai_usage.tokens_used);

-- Create ai_usage records for users who have historical data but no ai_usage record yet
INSERT INTO public.ai_usage (user_id, email, tokens_used, tts_requests, user_plan, last_reset, created_at, updated_at)
SELECT DISTINCT 
  COALESCE(oai.user_id, tts.user_id) as user_id,
  COALESCE(oai.user_id::text, tts.user_id::text) as email,
  COALESCE((
    SELECT COALESCE(SUM(tokens_used), 0)
    FROM public.openai_requests oai2 
    WHERE oai2.user_id = COALESCE(oai.user_id, tts.user_id)
      AND date_trunc('month', oai2.created_at) = date_trunc('month', CURRENT_DATE)
  ), 0) as tokens_used,
  COALESCE((
    SELECT COUNT(*)
    FROM public.text_to_speech_requests tts2 
    WHERE tts2.user_id = COALESCE(oai.user_id, tts.user_id)
      AND date_trunc('month', tts2.created_at) = date_trunc('month', CURRENT_DATE)
  ), 0) as tts_requests,
  'free' as user_plan,
  CURRENT_DATE as last_reset,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM (
  SELECT DISTINCT user_id FROM public.openai_requests WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM public.text_to_speech_requests WHERE user_id IS NOT NULL
) users(user_id)
FULL OUTER JOIN public.openai_requests oai ON oai.user_id = users.user_id
FULL OUTER JOIN public.text_to_speech_requests tts ON tts.user_id = users.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_usage existing 
  WHERE existing.user_id = COALESCE(oai.user_id, tts.user_id)
);

-- Update user plans based on subscription status
UPDATE public.ai_usage 
SET user_plan = CASE 
  WHEN EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.user_id = ai_usage.user_id 
    AND s.status = 'active'
  ) THEN 'plus'
  ELSE 'free'
END
WHERE user_id IS NOT NULL;