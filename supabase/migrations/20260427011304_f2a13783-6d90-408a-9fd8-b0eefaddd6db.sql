
-- AI Infrastructure global settings (singleton row)
CREATE TABLE IF NOT EXISTS public.ai_infrastructure_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  default_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  fallback_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2048,
  rag_enabled BOOLEAN NOT NULL DEFAULT true,
  rag_top_k INTEGER NOT NULL DEFAULT 8,
  use_writing_style BOOLEAN NOT NULL DEFAULT true,
  use_ai_memory BOOLEAN NOT NULL DEFAULT true,
  safety_level TEXT NOT NULL DEFAULT 'standard', -- 'off' | 'standard' | 'strict'
  blocked_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  system_prompt_override TEXT,
  fine_tune_enabled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ai_infrastructure_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read AI infra settings" ON public.ai_infrastructure_settings;
CREATE POLICY "Admins can read AI infra settings"
  ON public.ai_infrastructure_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert AI infra settings" ON public.ai_infrastructure_settings;
CREATE POLICY "Admins can insert AI infra settings"
  ON public.ai_infrastructure_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update AI infra settings" ON public.ai_infrastructure_settings;
CREATE POLICY "Admins can update AI infra settings"
  ON public.ai_infrastructure_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed singleton if none exists
INSERT INTO public.ai_infrastructure_settings (kill_switch)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.ai_infrastructure_settings);

-- Add a 'blueprint_svg' column to idea_planner_ideas for the visual blueprint
ALTER TABLE public.idea_planner_ideas
  ADD COLUMN IF NOT EXISTS blueprint_svg TEXT,
  ADD COLUMN IF NOT EXISTS blueprint_kind TEXT DEFAULT 'system'; -- 'system' | 'physical' | 'leather' | 'wood' | 'electronic'
