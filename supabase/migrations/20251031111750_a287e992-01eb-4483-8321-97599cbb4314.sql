-- Create ai_memory table for CriderGPT v3.4 memory system
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  details TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'conversation',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own memories"
  ON public.ai_memory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories"
  ON public.ai_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON public.ai_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON public.ai_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_ai_memory_user_id ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_category ON public.ai_memory(category);
CREATE INDEX idx_ai_memory_created_at ON public.ai_memory(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();