
-- Add advanced add-ons JSONB column to AI infrastructure settings
ALTER TABLE public.ai_infrastructure_settings
  ADD COLUMN IF NOT EXISTS advanced_addons JSONB NOT NULL DEFAULT '{
    "model_router": {
      "mode": "best_available",
      "task_routes": {
        "chat": "default",
        "coding": "default",
        "image": "default",
        "long_reasoning": "default",
        "file_tasks": "default",
        "safety_sensitive": "default"
      }
    },
    "task_temperatures": {
      "factual": 0.2,
      "coding": 0.2,
      "chat": 0.4,
      "brainstorm": 0.8,
      "creative": 0.9
    },
    "rag_tuning": {
      "preset": "normal",
      "normal_top_k": 5,
      "deep_top_k": 15,
      "low_noise_top_k": 3,
      "source_priority": ["memory", "corpus", "writing_style"],
      "dedupe_memory": true,
      "show_retrieved_context": false
    },
    "memory_governance": {
      "review_required": false,
      "min_confidence": 0.5,
      "categories": ["personal", "project", "preference", "fact", "task"]
    },
    "tool_permissions": {
      "read_only": false,
      "ask_before_write": true,
      "ask_before_delete": true,
      "blocked_tools": [],
      "admin_only_tools": []
    },
    "privacy_mode": {
      "local_only": false,
      "cloud_fallback_allowed": true,
      "strip_pii_before_cloud": true,
      "no_store_sensitive": false,
      "retention_days": 90
    },
    "output_verification": {
      "safety_check": false,
      "factual_check": false,
      "formatting_check": false,
      "instruction_check": false,
      "show_confidence": false
    },
    "logging": {
      "replay_console_enabled": true,
      "log_prompts": true,
      "log_rag_entries": true,
      "log_tools": true,
      "log_latency": true
    },
    "fallback": {
      "fallback_model": "google/gemini-3-flash-preview",
      "retry_count": 2,
      "timeout_ms": 30000,
      "local_to_cloud_fallback": true,
      "friendly_error_message": "CriderGPT is taking a breather. Try again in a moment."
    },
    "emergency": {
      "disable_ai": false,
      "disable_tools": false,
      "disable_cloud_fallback": false,
      "lock_public_access": false,
      "maintenance_mode": false
    }
  }'::jsonb;

-- Memory review queue
CREATE TABLE IF NOT EXISTS public.ai_memory_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID,
  user_id UUID,
  category TEXT,
  content TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_memory_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view memory review queue"
  ON public.ai_memory_review FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage memory review queue"
  ON public.ai_memory_review FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_memory_review_status ON public.ai_memory_review(status, created_at DESC);
