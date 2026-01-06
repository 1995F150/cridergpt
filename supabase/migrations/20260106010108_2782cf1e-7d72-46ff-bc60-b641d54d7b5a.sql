-- Remove duplicate JR Hoback entries, keep only the main one
DELETE FROM public.character_references 
WHERE slug IN ('jr-hoback-2', 'jr-hoback-3');

-- Update the main JR Hoback entry with combined traits from all reference photos
UPDATE public.character_references 
SET 
  traits = 'curly gray-brown hair, blue eyes, warm friendly smile, medium build, sometimes has full beard, casual clothing style including sweaters and t-shirts, often photographed reading or in outdoor/camping settings',
  description = 'Older man with curly gray-brown hair, blue eyes. Has a warm, friendly demeanor. Sometimes clean-shaven with a gentle smile, sometimes with a full beard. Often seen reading books or in casual camping environments.',
  context = 'Family friend, outdoorsman, avid reader. Multiple reference photos available showing different angles and with/without beard for maximum accuracy.'
WHERE slug = 'jr-hoback';