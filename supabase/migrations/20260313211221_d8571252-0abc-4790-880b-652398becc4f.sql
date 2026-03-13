
-- Create voice_profiles table
CREATE TABLE public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sample_url TEXT,
  sample_path TEXT,
  sample_duration_seconds NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  is_default BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own voice profiles"
  ON public.voice_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own voice profiles"
  ON public.voice_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own voice profiles"
  ON public.voice_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own voice profiles"
  ON public.voice_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_voice_profiles_updated_at
  BEFORE UPDATE ON public.voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-samples',
  'voice-samples',
  false,
  52428800,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a']
);

-- Storage RLS policies
CREATE POLICY "Users can upload voice samples"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own voice samples"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own voice samples"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);
