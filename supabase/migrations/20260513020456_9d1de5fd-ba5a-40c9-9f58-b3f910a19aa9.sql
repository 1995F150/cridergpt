-- Retire old placeholder listing
UPDATE public.store_products
SET is_active = false, updated_at = now()
WHERE title = 'Leather cord keeper' AND price = 4.99;

-- Standard: Dark Brown
INSERT INTO public.store_products (
  title, description, category, price, image_url, stock_quantity,
  is_active, is_digital, free_shipping, tags, sku
) VALUES (
  'Cord Keeper — Dark Brown Leather',
  'Handmade leather cord keeper in dark brown with a solid brass snap. Keeps your charging cables, headphones, or paracord coiled and clean. Each one cut and finished by hand on the farm — no two exactly alike.',
  'leather',
  14.99,
  null,
  8,
  true,
  false,
  false,
  ARRAY['leather','cord-keeper','brass','handmade','dark-brown'],
  'CK-DARK-BROWN'
);

-- Standard: Brown Bourbon
INSERT INTO public.store_products (
  title, description, category, price, image_url, stock_quantity,
  is_active, is_digital, free_shipping, tags, sku
) VALUES (
  'Cord Keeper — Brown Bourbon Leather',
  'Handmade leather cord keeper in rich brown bourbon with a solid brass snap. Warmer tone than the dark brown, ages beautifully with use. Coiled cable holder for charging cords, headphones, or paracord.',
  'leather',
  16.99,
  null,
  7,
  true,
  false,
  false,
  ARRAY['leather','cord-keeper','brass','handmade','brown-bourbon'],
  'CK-BROWN-BOURBON'
);

-- Premium: Engraved
INSERT INTO public.store_products (
  title, description, category, price, image_url, stock_quantity,
  is_active, is_digital, free_shipping, tags, sku, metadata
) VALUES (
  'Cord Keeper — Engraved Premium',
  'Premium handmade leather cord keeper with custom laser-engraved weapon design (your pick). Choice of dark brown or brown bourbon leather, solid brass snap. Made to order — please allow extra time for engraving and curing. Each piece is one-of-one.',
  'leather',
  29.99,
  null,
  0,
  true,
  false,
  false,
  ARRAY['leather','cord-keeper','engraved','premium','custom','brass'],
  'CK-ENGRAVED-PREMIUM',
  jsonb_build_object(
    'made_to_order', true,
    'options', jsonb_build_object(
      'leather', ARRAY['dark-brown','brown-bourbon'],
      'engraving', 'custom-weapon-design'
    ),
    'lead_time_days', 7
  )
);