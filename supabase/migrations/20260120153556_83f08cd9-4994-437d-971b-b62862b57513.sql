-- Guardian Relationships Table (parent-child connections)
CREATE TABLE public.guardian_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_email TEXT,
  child_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  invite_code TEXT UNIQUE,
  relationship_label TEXT DEFAULT 'Parent',
  monitoring_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Child Activity Logs Table
CREATE TABLE public.child_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('chat_message', 'file_upload', 'login', 'feature_access', 'ai_interaction')),
  activity_content TEXT,
  metadata JSONB DEFAULT '{}',
  ai_safety_score INTEGER CHECK (ai_safety_score >= 1 AND ai_safety_score <= 100),
  ai_flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guardian Alerts Table
CREATE TABLE public.guardian_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('content_warning', 'usage_spike', 'late_night_usage', 'concerning_topic', 'manual_check')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  activity_log_id UUID REFERENCES public.child_activity_logs(id) ON DELETE SET NULL,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guardian Settings Table
CREATE TABLE public.guardian_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES public.guardian_relationships(id) ON DELETE CASCADE,
  receive_real_time_notifications BOOLEAN DEFAULT true,
  email_daily_summary BOOLEAN DEFAULT false,
  monitor_chat_content BOOLEAN DEFAULT true,
  monitor_file_uploads BOOLEAN DEFAULT true,
  usage_time_alerts BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is guardian of child
CREATE OR REPLACE FUNCTION public.is_guardian_of(guardian_uuid UUID, child_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.guardian_relationships
    WHERE guardian_id = guardian_uuid
    AND child_id = child_uuid
    AND status = 'accepted'
    AND monitoring_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guardian Relationships Policies
CREATE POLICY "Guardians can view their own relationships"
ON public.guardian_relationships FOR SELECT
USING (auth.uid() = guardian_id OR auth.uid() = child_id);

CREATE POLICY "Guardians can create invites"
ON public.guardian_relationships FOR INSERT
WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "Guardians and children can update relationships"
ON public.guardian_relationships FOR UPDATE
USING (auth.uid() = guardian_id OR auth.uid() = child_id);

CREATE POLICY "Guardians can delete their relationships"
ON public.guardian_relationships FOR DELETE
USING (auth.uid() = guardian_id);

-- Child Activity Logs Policies
CREATE POLICY "Children can view their own activity"
ON public.child_activity_logs FOR SELECT
USING (auth.uid() = child_id);

CREATE POLICY "Guardians can view monitored child activity"
ON public.child_activity_logs FOR SELECT
USING (public.is_guardian_of(auth.uid(), child_id));

CREATE POLICY "System can insert activity logs"
ON public.child_activity_logs FOR INSERT
WITH CHECK (auth.uid() = child_id);

-- Guardian Alerts Policies
CREATE POLICY "Guardians can view their alerts"
ON public.guardian_alerts FOR SELECT
USING (auth.uid() = guardian_id);

CREATE POLICY "Guardians can update their alerts"
ON public.guardian_alerts FOR UPDATE
USING (auth.uid() = guardian_id);

CREATE POLICY "System can insert alerts for guardians"
ON public.guardian_alerts FOR INSERT
WITH CHECK (public.is_guardian_of(guardian_id, child_id));

-- Guardian Settings Policies
CREATE POLICY "Users can view settings for their relationships"
ON public.guardian_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guardian_relationships gr
    WHERE gr.id = relationship_id
    AND (gr.guardian_id = auth.uid() OR gr.child_id = auth.uid())
  )
);

CREATE POLICY "Guardians can manage their settings"
ON public.guardian_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.guardian_relationships gr
    WHERE gr.id = relationship_id
    AND gr.guardian_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_guardian_relationships_guardian ON public.guardian_relationships(guardian_id);
CREATE INDEX idx_guardian_relationships_child ON public.guardian_relationships(child_id);
CREATE INDEX idx_guardian_relationships_invite_code ON public.guardian_relationships(invite_code);
CREATE INDEX idx_child_activity_logs_child ON public.child_activity_logs(child_id);
CREATE INDEX idx_child_activity_logs_created ON public.child_activity_logs(created_at DESC);
CREATE INDEX idx_guardian_alerts_guardian ON public.guardian_alerts(guardian_id);
CREATE INDEX idx_guardian_alerts_unacknowledged ON public.guardian_alerts(guardian_id) WHERE acknowledged = false;

-- Trigger for updated_at on guardian_relationships
CREATE TRIGGER update_guardian_relationships_updated_at
BEFORE UPDATE ON public.guardian_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on guardian_settings
CREATE TRIGGER update_guardian_settings_updated_at
BEFORE UPDATE ON public.guardian_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();