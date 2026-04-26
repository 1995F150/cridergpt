CREATE TABLE public.idea_planner_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  summary TEXT,
  mermaid TEXT,
  parts JSONB DEFAULT '[]'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_planner_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ideas"
  ON public.idea_planner_ideas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins create ideas"
  ON public.idea_planner_ideas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins update ideas"
  ON public.idea_planner_ideas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ideas"
  ON public.idea_planner_ideas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_idea_planner_ideas_updated_at
  BEFORE UPDATE ON public.idea_planner_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_idea_planner_ideas_user ON public.idea_planner_ideas(user_id, created_at DESC);