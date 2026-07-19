
CREATE POLICY "Owners update own public profile"
  ON public.livestock_public_profiles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.livestock_animals a
      WHERE a.id = livestock_public_profiles.animal_id
        AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete own public profile"
  ON public.livestock_public_profiles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER trg_lpp_updated_at BEFORE UPDATE ON public.livestock_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.livestock_public_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES public.livestock_animals(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  source_health_record_id uuid REFERENCES public.livestock_health_records(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('vaccination','allergy','medication_alert','condition','other')),
  public_title text NOT NULL,
  public_summary text,
  event_date date,
  next_due_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lphr_owner ON public.livestock_public_health_records(owner_id);
CREATE INDEX idx_lphr_animal ON public.livestock_public_health_records(animal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock_public_health_records TO authenticated;
GRANT ALL ON public.livestock_public_health_records TO service_role;

ALTER TABLE public.livestock_public_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own public health"
  ON public.livestock_public_health_records FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners insert own public health"
  ON public.livestock_public_health_records FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.livestock_animals a
      WHERE a.id = livestock_public_health_records.animal_id
        AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners update own public health"
  ON public.livestock_public_health_records FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.livestock_animals a
      WHERE a.id = livestock_public_health_records.animal_id
        AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete own public health"
  ON public.livestock_public_health_records FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER trg_lphr_updated_at BEFORE UPDATE ON public.livestock_public_health_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
