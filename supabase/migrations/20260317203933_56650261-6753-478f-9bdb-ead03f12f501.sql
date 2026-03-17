
CREATE TABLE public.snapchat_lens_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lens_name TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_views INTEGER DEFAULT 0,
  total_plays INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  top_countries JSONB DEFAULT '[]'::jsonb,
  top_interests JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.snapchat_lens_analytics ENABLE ROW LEVEL SECURITY;

-- Only admins/founder can manage this data
CREATE POLICY "Authenticated users can view lens analytics"
  ON public.snapchat_lens_analytics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only founder can insert lens analytics"
  ON public.snapchat_lens_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND is_active = true)
  );

CREATE POLICY "Only founder can update lens analytics"
  ON public.snapchat_lens_analytics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND is_active = true)
  );

CREATE POLICY "Only founder can delete lens analytics"
  ON public.snapchat_lens_analytics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND is_active = true)
  );

CREATE TRIGGER update_snapchat_lens_analytics_updated_at
  BEFORE UPDATE ON public.snapchat_lens_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
