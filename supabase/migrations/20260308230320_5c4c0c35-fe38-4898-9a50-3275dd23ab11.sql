CREATE TABLE public.learning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  gap_description text,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'learned', 'dismissed')),
  source text DEFAULT 'auto',
  learned_data text,
  detected_from text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.learning_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage learning queue"
  ON public.learning_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));