-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '3d-models',
  '3d-models',
  true,
  104857600, -- 100MB limit
  ARRAY[
    'application/octet-stream',
    'model/gltf-binary',
    'model/gltf+json',
    'model/obj',
    'model/fbx',
    'application/xml',
    'text/xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for 3d-models bucket
CREATE POLICY "Authenticated users can upload 3D models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = '3d-models' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own 3D models"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = '3d-models' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own 3D models"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = '3d-models' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read for converted .i3d files
CREATE POLICY "Public can view 3D models"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = '3d-models');