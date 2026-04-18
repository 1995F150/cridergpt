
CREATE TABLE public.farmbureau_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  farm_name TEXT,
  county TEXT,
  livestock_type TEXT,
  herd_size INTEGER,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'farmbureau_landing',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmbureau_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public form)
CREATE POLICY "Anyone can submit a farmbureau lead"
  ON public.farmbureau_leads FOR INSERT
  WITH CHECK (true);

-- Only admins can view leads
CREATE POLICY "Admins can view farmbureau leads"
  ON public.farmbureau_leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update farmbureau leads"
  ON public.farmbureau_leads FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_farmbureau_leads_created ON public.farmbureau_leads(created_at DESC);
