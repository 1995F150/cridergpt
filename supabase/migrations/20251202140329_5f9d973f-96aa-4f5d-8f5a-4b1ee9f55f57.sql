-- Create chapters table for FFA chapters
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_ffa_profiles table for FFA-specific user data
CREATE TABLE IF NOT EXISTS public.user_ffa_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  state TEXT,
  officer_role TEXT,
  is_advisor BOOLEAN DEFAULT false,
  graduation_year INTEGER,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create events table with visibility and chapter support
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'chapter')),
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chapter_documents table for FFA resources
CREATE TABLE IF NOT EXISTS public.chapter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'resource',
  file_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chapter_awards table
CREATE TABLE IF NOT EXISTS public.chapter_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  award_date DATE,
  award_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ffa_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_awards ENABLE ROW LEVEL SECURITY;

-- Chapters policies (viewable by authenticated users)
CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT TO authenticated USING (true);

-- User FFA profiles policies
CREATE POLICY "Users can view their own FFA profile" ON public.user_ffa_profiles 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FFA profile" ON public.user_ffa_profiles 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FFA profile" ON public.user_ffa_profiles 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view personal events they created" ON public.events 
  FOR SELECT TO authenticated 
  USING (
    (visibility = 'personal' AND created_by = auth.uid())
    OR
    (visibility = 'chapter' AND chapter_id IN (
      SELECT chapter_id FROM public.user_ffa_profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create events" ON public.events 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events or chapter events if officer/advisor" ON public.events 
  FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()
    OR
    (visibility = 'chapter' AND EXISTS (
      SELECT 1 FROM public.user_ffa_profiles 
      WHERE user_id = auth.uid() 
        AND chapter_id = events.chapter_id 
        AND (officer_role IS NOT NULL OR is_advisor = true)
    ))
  );

CREATE POLICY "Users can delete their own events or chapter events if officer/advisor" ON public.events 
  FOR DELETE TO authenticated 
  USING (
    created_by = auth.uid()
    OR
    (visibility = 'chapter' AND EXISTS (
      SELECT 1 FROM public.user_ffa_profiles 
      WHERE user_id = auth.uid() 
        AND chapter_id = events.chapter_id 
        AND (officer_role IS NOT NULL OR is_advisor = true)
    ))
  );

-- Chapter documents policies
CREATE POLICY "Users can view chapter documents for their chapter" ON public.chapter_documents 
  FOR SELECT TO authenticated 
  USING (
    is_public = true
    OR
    chapter_id IN (SELECT chapter_id FROM public.user_ffa_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create documents for their chapter" ON public.chapter_documents 
  FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() = created_by 
    AND chapter_id IN (SELECT chapter_id FROM public.user_ffa_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Officers/advisors can update chapter documents" ON public.chapter_documents 
  FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_ffa_profiles 
      WHERE user_id = auth.uid() 
        AND chapter_id = chapter_documents.chapter_id 
        AND (officer_role IS NOT NULL OR is_advisor = true)
    )
  );

CREATE POLICY "Officers/advisors can delete chapter documents" ON public.chapter_documents 
  FOR DELETE TO authenticated 
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_ffa_profiles 
      WHERE user_id = auth.uid() 
        AND chapter_id = chapter_documents.chapter_id 
        AND (officer_role IS NOT NULL OR is_advisor = true)
    )
  );

-- Chapter awards policies
CREATE POLICY "Users can view awards for their chapter" ON public.chapter_awards 
  FOR SELECT TO authenticated 
  USING (
    chapter_id IN (SELECT chapter_id FROM public.user_ffa_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Officers/advisors can manage awards" ON public.chapter_awards 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_ffa_profiles 
      WHERE user_id = auth.uid() 
        AND chapter_id = chapter_awards.chapter_id 
        AND (officer_role IS NOT NULL OR is_advisor = true)
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_chapters_updated_at ON public.chapters;
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_trigger();

DROP TRIGGER IF EXISTS update_user_ffa_profiles_updated_at ON public.user_ffa_profiles;
CREATE TRIGGER update_user_ffa_profiles_updated_at BEFORE UPDATE ON public.user_ffa_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_trigger();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_trigger();

DROP TRIGGER IF EXISTS update_chapter_documents_updated_at ON public.chapter_documents;
CREATE TRIGGER update_chapter_documents_updated_at BEFORE UPDATE ON public.chapter_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_trigger();

-- Insert some default chapters for testing
INSERT INTO public.chapters (name, state, city) VALUES 
  ('Southwest Virginia FFA', 'Virginia', 'Wytheville'),
  ('Blacksburg FFA', 'Virginia', 'Blacksburg'),
  ('Roanoke Valley FFA', 'Virginia', 'Roanoke')
ON CONFLICT DO NOTHING;