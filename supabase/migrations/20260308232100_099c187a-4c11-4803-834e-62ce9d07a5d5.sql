
CREATE TABLE public.build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  build_type text NOT NULL DEFAULT 'debug',
  version_name text,
  version_code integer,
  status text NOT NULL DEFAULT 'requested',
  log_output text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.build_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage build logs"
ON public.build_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
