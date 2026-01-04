-- Insert additional Savanaa references (keeping the primary one but adding more reference options)
INSERT INTO character_references (slug, name, reference_photo_url, traits, era, description, context, is_primary, pronouns)
VALUES 
  ('savanaa-2', 'Savanaa', '/savanna-reference-3.png', 'Young woman, dark hair, bold style, confident, expressive', 'Modern', 'Savanaa - Jessie''s significant other', 'Always generate with accurate likeness. Use reference photos for facial features.', false, 'she/her'),
  ('savanaa-3', 'Savanaa', '/savanna-reference-4.png', 'Young woman, dark hair, bold style, confident, expressive', 'Modern', 'Savanaa - Jessie''s significant other', 'Always generate with accurate likeness. Use reference photos for facial features.', false, 'she/her'),
  ('savanaa-4', 'Savanaa', '/savanna-reference-5.png', 'Young woman, dark hair, bold style, confident, expressive', 'Modern', 'Savanaa - Jessie''s significant other', 'Always generate with accurate likeness. Use reference photos for facial features.', false, 'she/her');

-- Update the primary Savanaa entry with better context
UPDATE character_references 
SET 
  description = 'Savanaa - Jessie''s significant other. Young woman with dark hair and bold personality.',
  context = 'Always generate with accurate likeness matching reference photos. Key features: dark hair, confident expression, bold style.',
  is_primary = true
WHERE slug = 'savanaa';