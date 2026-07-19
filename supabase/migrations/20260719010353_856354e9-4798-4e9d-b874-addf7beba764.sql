
DROP POLICY IF EXISTS "test_select" ON public.livestock_public_profiles;
CREATE POLICY "Owners select own public profile"
  ON public.livestock_public_profiles FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
