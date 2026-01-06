-- Remove duplicate Savanaa entry to prevent "Savanaa Savanaa" detection
DELETE FROM character_references WHERE slug = 'savanaa-ref2';