-- Create a table to track user updates and changes
CREATE TABLE public.user_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  update_type TEXT NOT NULL, -- 'api_key_added', 'tts_request', 'file_upload', 'project_created', etc.
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- Additional data about the update
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own updates
CREATE POLICY "Users can view their own updates" 
ON public.user_updates 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own updates
CREATE POLICY "Users can insert their own updates" 
ON public.user_updates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for service role to insert updates
CREATE POLICY "Service role can insert updates" 
ON public.user_updates 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for this table
ALTER TABLE public.user_updates REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_updates;