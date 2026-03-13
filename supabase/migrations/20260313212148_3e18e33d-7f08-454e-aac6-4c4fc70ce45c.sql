
-- Create music_tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Track',
  track_type TEXT NOT NULL DEFAULT 'generate' CHECK (track_type IN ('generate', 'cover', 'hum', 'beat')),
  prompt TEXT,
  genre TEXT,
  mood TEXT,
  bpm INTEGER,
  duration_seconds INTEGER,
  audio_url TEXT,
  source_audio_url TEXT,
  voice_profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tracks
CREATE POLICY "Users can view own tracks" ON public.music_tracks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own tracks
CREATE POLICY "Users can insert own tracks" ON public.music_tracks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own tracks
CREATE POLICY "Users can update own tracks" ON public.music_tracks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own tracks
CREATE POLICY "Users can delete own tracks" ON public.music_tracks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_music_tracks_updated_at
  BEFORE UPDATE ON public.music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
