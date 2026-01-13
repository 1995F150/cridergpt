-- Create user_patterns table for tracking behavioral patterns
CREATE TABLE public.user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'topic', 'tone', 'time', 'category'
  pattern_key TEXT NOT NULL,  -- e.g., 'fs25_modding', 'stock_investing'
  frequency INTEGER DEFAULT 1,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  last_seen TIMESTAMPTZ DEFAULT now(),
  first_seen TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_preferences table for learned preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'tone', 'detail_level', 'format', 'language_style'
  preference_value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create pending_tasks table for follow-up reminders
CREATE TABLE public.pending_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_description TEXT NOT NULL,
  detected_from TEXT, -- topic/context where task was detected
  status TEXT DEFAULT 'pending', -- 'pending', 'reminded', 'completed', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT now(),
  remind_after TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_patterns
CREATE POLICY "Users can view their own patterns"
ON public.user_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns"
ON public.user_patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
ON public.user_patterns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns"
ON public.user_patterns FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for pending_tasks
CREATE POLICY "Users can view their own pending tasks"
ON public.pending_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending tasks"
ON public.pending_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending tasks"
ON public.pending_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending tasks"
ON public.pending_tasks FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_user_patterns_user_id ON public.user_patterns(user_id);
CREATE INDEX idx_user_patterns_type_key ON public.user_patterns(pattern_type, pattern_key);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_pending_tasks_user_id ON public.pending_tasks(user_id);
CREATE INDEX idx_pending_tasks_status ON public.pending_tasks(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_patterns_updated_at
BEFORE UPDATE ON public.user_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_tasks_updated_at
BEFORE UPDATE ON public.pending_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();