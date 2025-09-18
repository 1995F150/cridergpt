-- Update plan configurations to match the new CriderGPT feature matrix

-- Update Free plan
UPDATE public.plan_configurations 
SET 
  features = '["AI Chat (13 tokens/month)", "Agricultural Calculators", "FFA Dashboard + Theme", "CB & Radio Tuner", "System Updates Access", "Community Support"]'::jsonb,
  limits = '{"tokens": 13, "tts": 5, "projects": 1, "api_keys": 2, "file_upload_mb": 10, "ai_images": 0, "document_analysis": 0}'::jsonb
WHERE plan_name = 'free';

-- Update Plus plan to match CriderGPT Plu features  
UPDATE public.plan_configurations 
SET 
  plan_display_name = 'CriderGPT Plu',
  features = '["AI Chat (limited - 200 tokens/month)", "AI Image Generator (10 images/month)", "Document Analyzer (20 docs/month)", "Agricultural Calculators", "FFA Dashboard + Theme", "CB & Radio Tuner", "TTS (100 requests/month)", "Priority Support"]'::jsonb,
  limits = '{"tokens": 200, "tts": 100, "projects": 5, "api_keys": 5, "file_upload_mb": 100, "ai_images": 10, "document_analysis": 20}'::jsonb
WHERE plan_name = 'plus';

-- Update Pro plan to match CriderGPT Pro features
UPDATE public.plan_configurations 
SET 
  plan_display_name = 'CriderGPT Pro',
  features = '["AI Chat (Unlimited)", "AI Voice Chat", "AI Image Generator (Unlimited)", "Document Analyzer (Unlimited)", "Invoicing System", "Agricultural Calculators", "Business Intelligence", "QuickBooks Integration", "FFA Dashboard + Theme", "CB & Radio Tuner", "TTS (Unlimited)", "Priority Support", "API Access"]'::jsonb,
  limits = '{"tokens": -1, "tts": -1, "projects": -1, "api_keys": -1, "file_upload_mb": 1000, "ai_images": -1, "document_analysis": -1}'::jsonb
WHERE plan_name = 'pro';