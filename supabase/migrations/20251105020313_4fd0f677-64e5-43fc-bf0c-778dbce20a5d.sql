-- Create google_integrations table
CREATE TABLE public.google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN ('drive', 'gmail', 'calendar')),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable RLS
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own integrations
CREATE POLICY "Users can view their own integrations"
  ON public.google_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can insert their own integrations"
  ON public.google_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update their own integrations"
  ON public.google_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete their own integrations"
  ON public.google_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_google_integrations_user_id ON public.google_integrations(user_id);
CREATE INDEX idx_google_integrations_service ON public.google_integrations(service_name);

-- Create google_integration_activity table for transparency logging
CREATE TABLE public.google_integration_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_integration_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view their own activity"
  ON public.google_integration_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert activity logs
CREATE POLICY "Service role can insert activity"
  ON public.google_integration_activity
  FOR INSERT
  WITH CHECK (true);

-- Create index for activity logs
CREATE INDEX idx_google_activity_user_id ON public.google_integration_activity(user_id);
CREATE INDEX idx_google_activity_created_at ON public.google_integration_activity(created_at DESC);