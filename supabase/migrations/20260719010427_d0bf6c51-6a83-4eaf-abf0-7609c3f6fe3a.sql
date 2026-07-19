
CREATE POLICY "Owners insert own public profile"
  ON public.livestock_public_profiles FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.livestock_animals a
      WHERE a.id = livestock_public_profiles.animal_id
        AND a.owner_id = auth.uid()
    )
  );
