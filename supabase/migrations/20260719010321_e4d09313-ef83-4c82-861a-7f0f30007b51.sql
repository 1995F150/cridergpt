
ALTER TABLE public.livestock_public_profiles
  ADD CONSTRAINT fk_lpp_animal FOREIGN KEY (animal_id)
  REFERENCES public.livestock_animals(id) ON DELETE CASCADE;
