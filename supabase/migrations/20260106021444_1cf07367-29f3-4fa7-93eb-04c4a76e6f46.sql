-- Standardize character reference URLs to relative paths
UPDATE character_references 
SET reference_photo_url = '/dr-harman-reference-1.png'
WHERE slug = 'dr-harman';

UPDATE character_references 
SET reference_photo_url = '/savanaa-reference-1.png'
WHERE slug = 'savanaa';