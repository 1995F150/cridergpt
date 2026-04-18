INSERT INTO public.digital_products (
  title, slug, description, category, product_type,
  price_cents, currency, cover_image_url, download_url,
  license_terms, tags, featured, active, sort_order, metadata
) VALUES (
  'American Midwest Shouse — Custom Edit (FS25)',
  'fs25-midwest-shouse-4posters',
  E'Farming Simulator 25 placeable shed-house with full living quarters, workshop, customization, lighting, and solar panel options.\n\nCustom edited version by Jessie Crider — updated interior posters and texture edits while keeping the original functionality intact.\n\nFeatures:\n• Sleep, change look, repaint, repair & customize vehicles\n• Interior + automatic exterior lighting\n• Workshop area: storage shelves, repair, repaint, customize, sell vehicles\n• Customizable wall flags & brand posters\n• Living quarters: open kitchen, living room, wardrobe, toilet, bedroom, office\n• In-game PC color selector for building trim\n• Color & solar panel configurations\n\nIn-game price: $120,000 · Daily upkeep: $15\n\nOriginal mod by ikas. Custom edit by Jessie Crider.',
  'fs25-mods',
  'download',
  499,
  'usd',
  'https://udpldrrpebdyuiqdtqnq.supabase.co/storage/v1/object/public/digital-products/covers/fs25-midwest-shouse-4posters.jpg',
  'digital-products/mods/FS25_MidwestShouse_4Posters.zip',
  E'Personal & farm use only. Original mod by ikas. Do not redistribute or re-upload. Custom edits © Jessie Crider.',
  ARRAY['fs25','farming-simulator-25','placeable','shed-house','midwest','farmhouse','workshop'],
  true,
  true,
  10,
  jsonb_build_object(
    'mod_version', '1.1.0.0',
    'authors', jsonb_build_array('ikas','Jessie Crider'),
    'game', 'Farming Simulator 25',
    'category_in_game', 'Farmhouses, Sheds, Storages',
    'multiplayer', true,
    'file_size_mb', 47,
    'storage_path', 'mods/FS25_MidwestShouse_4Posters.zip'
  )
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  cover_image_url = EXCLUDED.cover_image_url,
  download_url = EXCLUDED.download_url,
  license_terms = EXCLUDED.license_terms,
  tags = EXCLUDED.tags,
  featured = EXCLUDED.featured,
  active = EXCLUDED.active,
  metadata = EXCLUDED.metadata,
  updated_at = now();