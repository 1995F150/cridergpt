
-- Create agent_execution_queue table
CREATE TABLE public.agent_execution_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  keyword TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  vision_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  kill_switch BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.agent_execution_queue ENABLE ROW LEVEL SECURITY;

-- Only the owner can read/write their own rows
CREATE POLICY "Users can view own agent tasks"
  ON public.agent_execution_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent tasks"
  ON public.agent_execution_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent tasks"
  ON public.agent_execution_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent tasks"
  ON public.agent_execution_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Index for polling pending tasks efficiently
CREATE INDEX idx_agent_queue_status_user ON public.agent_execution_queue (user_id, status);

-- Create agent_status table for heartbeat tracking
CREATE TABLE public.agent_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  agent_version TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent status"
  ON public.agent_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own agent status"
  ON public.agent_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent status"
  ON public.agent_status FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage bucket for vision screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-vision', 'agent-vision', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own vision screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agent-vision' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own vision screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-vision' AND auth.uid()::text = (storage.foldername(name))[1]);
