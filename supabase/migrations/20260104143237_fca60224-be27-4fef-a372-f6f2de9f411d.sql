-- Add Savanaa to character_references with multiple reference photos
INSERT INTO character_references (
  slug, name, pronouns, reference_photo_url, description, era, traits, context, is_primary, is_system
) VALUES 
(
  'savanaa',
  'Savanaa',
  'she/her',
  '/savanna-reference-1.png',
  'Close friend - modern era',
  'Modern',
  'Young woman, dark hair, bold style, confident, expressive',
  'Modern era friend. Use contemporary lighting and style. Can be generated alongside Jessie or others.',
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  reference_photo_url = EXCLUDED.reference_photo_url,
  traits = EXCLUDED.traits,
  context = EXCLUDED.context,
  description = EXCLUDED.description;