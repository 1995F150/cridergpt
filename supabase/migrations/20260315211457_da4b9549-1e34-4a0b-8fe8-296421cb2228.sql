
-- USB Data Logs table
CREATE TABLE public.usb_data_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  device_name TEXT,
  file_name TEXT,
  data_payload JSONB DEFAULT '{}',
  file_url TEXT,
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usb_data_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own USB logs" ON public.usb_data_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own USB logs" ON public.usb_data_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own USB logs" ON public.usb_data_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- USB uploads storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('usb-uploads', 'usb-uploads', false);

CREATE POLICY "Users can upload USB files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'usb-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own USB files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'usb-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own USB files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'usb-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
