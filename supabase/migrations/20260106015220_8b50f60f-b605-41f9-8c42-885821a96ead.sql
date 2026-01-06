-- Update Savanaa to use the correct reference photos with full URLs
-- First delete the existing entry
DELETE FROM character_references WHERE slug = 'savanaa';

-- Insert Savanaa with first reference (primary)
INSERT INTO character_references (
  slug, 
  name, 
  reference_photo_url, 
  pronouns, 
  description, 
  traits, 
  context, 
  era, 
  is_primary, 
  is_system,
  generation_count
) VALUES (
  'savanaa',
  'Savanaa',
  'https://crideros.lovable.app/savanaa-reference-1.png',
  'she/her',
  'Young woman with long dark wavy hair, warm brown eyes, natural clear skin, feminine features',
  'long dark brown/black wavy hair, warm expressive brown eyes, clear skin, full lips, defined eyebrows, feminine bone structure, natural beauty',
  'Jessie Crider girlfriend. CRITICAL: Copy face EXACTLY from ALL reference photos. Eyes, nose, lips, facial structure must match 100%.',
  'modern',
  true,
  true,
  0
);

-- Insert Savanaa second reference
INSERT INTO character_references (
  slug, 
  name, 
  reference_photo_url, 
  pronouns, 
  description, 
  traits, 
  context, 
  era, 
  is_primary, 
  is_system,
  generation_count
) VALUES (
  'savanaa-ref2',
  'Savanaa',
  'https://crideros.lovable.app/savanaa-reference-2.png',
  'she/her',
  'Young woman with long dark wavy hair, warm brown eyes, natural clear skin, feminine features - ADDITIONAL REFERENCE',
  'long dark brown/black wavy hair, warm expressive brown eyes, clear skin, full lips, defined eyebrows, feminine bone structure',
  'Additional reference for Savanaa - USE TOGETHER with savanaa primary reference for accurate face generation',
  'modern',
  false,
  true,
  0
);