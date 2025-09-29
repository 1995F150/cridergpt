-- Create table for categorized interactions
CREATE TABLE IF NOT EXISTS public.categorized_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  categorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categorized_interactions ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage categorized interactions"
ON public.categorized_interactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to view
CREATE POLICY "Users can view categorized interactions"
ON public.categorized_interactions
FOR SELECT
TO authenticated
USING (true);