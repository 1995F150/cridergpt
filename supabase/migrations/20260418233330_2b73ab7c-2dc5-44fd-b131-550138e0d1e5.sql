-- Create public bucket for digital product assets (covers + downloadable mod zips)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digital-products',
  'digital-products',
  true,
  104857600, -- 100MB
  ARRAY['image/jpeg','image/png','image/webp','application/zip','application/x-zip-compressed','application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for digital-products bucket
DROP POLICY IF EXISTS "Digital product assets are publicly readable" ON storage.objects;
CREATE POLICY "Digital product assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'digital-products');

-- Only admins can write to the bucket
DROP POLICY IF EXISTS "Admins can upload digital product assets" ON storage.objects;
CREATE POLICY "Admins can upload digital product assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'digital-products'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can update digital product assets" ON storage.objects;
CREATE POLICY "Admins can update digital product assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'digital-products'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete digital product assets" ON storage.objects;
CREATE POLICY "Admins can delete digital product assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'digital-products'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);