-- Create system_updates table for CriderOS announcements
CREATE TABLE public.system_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  version TEXT,
  type TEXT NOT NULL DEFAULT 'general', -- 'feature', 'bugfix', 'security', 'general'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but allow public read access
ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read system updates
CREATE POLICY "System updates are publicly readable" 
ON public.system_updates 
FOR SELECT 
USING (true);

-- Only authenticated users can insert/update (for admin purposes)
CREATE POLICY "Only authenticated users can manage system updates" 
ON public.system_updates 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_system_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_updates_updated_at
BEFORE UPDATE ON public.system_updates
FOR EACH ROW
EXECUTE FUNCTION update_system_updates_updated_at();

-- Insert some sample data
INSERT INTO public.system_updates (title, message, type, priority, version) VALUES
('Welcome to CriderOS v1.0', 'CriderOS is now live with AI chat, TTS, and project management features!', 'feature', 'high', 'v1.0.0'),
('Backend Code Generator Added', 'New AI-powered backend code generator now available in the tools section.', 'feature', 'normal', 'v1.1.0'),
('Security Update', 'Enhanced RLS policies for better data security and user privacy.', 'security', 'high', 'v1.0.1');