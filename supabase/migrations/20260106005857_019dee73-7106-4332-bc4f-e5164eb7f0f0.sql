-- Insert JR Hoback as a new character with all 3 reference photos
-- First reference (primary - clear face shot)
INSERT INTO public.character_references (
  name,
  slug,
  pronouns,
  reference_photo_url,
  reference_photo_path,
  description,
  traits,
  context,
  is_primary,
  is_system,
  generation_count
) VALUES (
  'JR Hoback',
  'jr-hoback',
  'he/him',
  '/jr-hoback-reference-1.jpg',
  'jr-hoback-reference-1.jpg',
  'Older man with curly gray-brown hair, blue eyes, and a friendly warm smile. Often seen reading or in casual outdoor settings.',
  'curly gray-brown hair, blue eyes, warm friendly smile, medium build, often wears casual clothing like sweaters and t-shirts, sometimes has a beard',
  'Family friend, outdoorsman, reader. Often photographed in camping or home settings.',
  false,
  true,
  0
);

-- Second reference (with beard)
INSERT INTO public.character_references (
  name,
  slug,
  pronouns,
  reference_photo_url,
  reference_photo_path,
  description,
  traits,
  context,
  is_primary,
  is_system,
  generation_count
) VALUES (
  'JR Hoback',
  'jr-hoback-2',
  'he/him',
  '/jr-hoback-reference-2.jpg',
  'jr-hoback-reference-2.jpg',
  'Older man with curly gray-brown hair, blue eyes, beard, and a thoughtful expression.',
  'curly gray-brown hair, blue eyes, full beard, medium build, casual yellow t-shirt',
  'Additional reference showing bearded appearance.',
  false,
  true,
  0
);

-- Third reference (side profile reading)
INSERT INTO public.character_references (
  name,
  slug,
  pronouns,
  reference_photo_url,
  reference_photo_path,
  description,
  traits,
  context,
  is_primary,
  is_system,
  generation_count
) VALUES (
  'JR Hoback',
  'jr-hoback-3',
  'he/him',
  '/jr-hoback-reference-3.jpg',
  'jr-hoback-reference-3.jpg',
  'Side profile of older man with curly hair reading a book in a tent setting.',
  'curly gray-brown hair, side profile, reading posture, casual outdoor clothing',
  'Additional reference showing side profile and reading activity.',
  false,
  true,
  0
);