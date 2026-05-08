
CREATE TABLE IF NOT EXISTS public.sms_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  twilio_from_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sms settings" ON public.sms_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sms_settings_updated_at
  BEFORE UPDATE ON public.sms_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms log" ON public.sms_log
  FOR SELECT USING (auth.uid() = user_id);
