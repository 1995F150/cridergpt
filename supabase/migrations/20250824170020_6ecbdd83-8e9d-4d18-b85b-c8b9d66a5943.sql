
-- Create table for storing AI interactions and learning data
CREATE TABLE public.ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_tags TEXT[], -- Array of tags like topic, category, etc.
  topic TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own interactions" 
  ON public.ai_interactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions" 
  ON public.ai_interactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" 
  ON public.ai_interactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" 
  ON public.ai_interactions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for better search performance
CREATE INDEX idx_ai_interactions_user_input ON public.ai_interactions USING gin(to_tsvector('english', user_input));
CREATE INDEX idx_ai_interactions_topic ON public.ai_interactions(topic);
CREATE INDEX idx_ai_interactions_category ON public.ai_interactions(category);
CREATE INDEX idx_ai_interactions_created_at ON public.ai_interactions(created_at DESC);
