-- Seed two global reference photos owned by the first admin
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.user_roles WHERE role = 'admin' ORDER BY created_at NULLS LAST LIMIT 1;
  IF owner_id IS NULL THEN
    SELECT user_id INTO owner_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  IF owner_id IS NULL THEN
    RAISE NOTICE 'No admin found, skipping reference seed';
    RETURN;
  END IF;

  INSERT INTO public.user_reference_library
    (user_id, name, slug, category, description, image_url, keywords, auto_attach, use_for, is_global)
  VALUES
    (
      owner_id,
      'My Truck (1st Gen Dodge)',
      'my-truck',
      'vehicle',
      'Jessie''s 1st gen Dodge Ram — reference for any image of "my truck".',
      'https://cridergpt.lovable.app/references/jessies-truck.png',
      ARRAY['my truck','jessies truck','jessie''s truck','the truck','1st gen dodge','first gen dodge','my dodge','my pickup','my ram','dodge ram first gen'],
      true,
      ARRAY['image'],
      true
    ),
    (
      owner_id,
      'Future House Blueprint (Southern Manor)',
      'future-house-blueprint',
      'blueprint',
      'Reference plan for Jessie''s future Southern manor home — used as the base for any "my house" or "my home" blueprint.',
      'https://cridergpt.lovable.app/references/southern-manor-blueprint.png',
      ARRAY['my house','my home','future house','dream house','my manor','southern manor','future home','my place','plantation house','my future house'],
      true,
      ARRAY['image','blueprint'],
      true
    )
  ON CONFLICT (user_id, slug) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    keywords = EXCLUDED.keywords,
    description = EXCLUDED.description,
    is_global = EXCLUDED.is_global,
    updated_at = now();
END $$;