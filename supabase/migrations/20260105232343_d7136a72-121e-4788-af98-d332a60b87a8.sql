-- Update Dr. Harman reference photo with accurate description
UPDATE public.character_references 
SET 
  reference_photo_url = '/dr-harman-reference.png',
  description = 'Historical 1800s portrait of elderly man with dark hair parted in middle, full thick beard going gray/white, intense eyes, wearing dark formal suit with white shirt',
  traits = 'full beard, graying beard, dark hair parted middle, intense gaze, 1800s formal attire, weathered face',
  era = '1800s',
  pronouns = 'he/him'
WHERE slug = 'dr-harman';