-- Add Savanaa with new reference photos
INSERT INTO public.character_references (
  slug,
  name,
  reference_photo_url,
  pronouns,
  era,
  description,
  traits,
  context,
  is_primary,
  is_system,
  generation_count
) VALUES (
  'savanaa',
  'Savanaa',
  '/savanaa-reference-1.png',
  'she/her',
  'modern',
  'Young woman with dark hair, warm expressive eyes, natural beauty, confident expression',
  'dark brown/black hair, warm brown eyes, natural clear skin, full lips, feminine features, confident demeanor',
  'Jessie Crider girlfriend. Use both reference photos for accurate identity. The face must match references 100%.',
  false,
  true,
  0
);