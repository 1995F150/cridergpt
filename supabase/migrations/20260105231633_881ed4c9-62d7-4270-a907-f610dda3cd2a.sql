-- Update the existing Jessie Crider reference photo URL and add description
UPDATE public.character_references 
SET 
  reference_photo_url = '/jessie-crider-reference-1.jpg',
  description = 'Young man with blonde/light brown wavy hair',
  traits = 'light skin, male, casual style',
  pronouns = 'he/him'
WHERE slug = 'jessie';