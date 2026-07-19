
CREATE TABLE public.livestock_public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  public_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock_public_profiles TO authenticated;
GRANT ALL ON public.livestock_public_profiles TO service_role;
ALTER TABLE public.livestock_public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_select" ON public.livestock_public_profiles FOR SELECT TO authenticated USING (owner_id = auth.uid());
