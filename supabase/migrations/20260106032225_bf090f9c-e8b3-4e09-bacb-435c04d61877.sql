-- Create broadcast_history table
CREATE TABLE public.broadcast_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.broadcast_history ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY "Admins can view broadcast history"
ON public.broadcast_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert broadcast history"
ON public.broadcast_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create system_status table for maintenance mode
CREATE TABLE public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN DEFAULT false,
  message TEXT DEFAULT 'We are currently performing scheduled maintenance. Please check back soon!',
  estimated_duration TEXT DEFAULT '1 hour',
  whitelist_ips TEXT[] DEFAULT '{}',
  scheduled_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Everyone can read system status (needed to check maintenance mode)
CREATE POLICY "Anyone can read system status"
ON public.system_status
FOR SELECT
USING (true);

-- Only admins can update system status
CREATE POLICY "Admins can update system status"
ON public.system_status
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert system status"
ON public.system_status
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default system status row
INSERT INTO public.system_status (maintenance_mode, message, estimated_duration)
VALUES (false, 'We are currently performing scheduled maintenance. Please check back soon!', '1 hour');