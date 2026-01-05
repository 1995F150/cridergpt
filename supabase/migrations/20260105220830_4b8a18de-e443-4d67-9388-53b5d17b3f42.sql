-- Create storage bucket for character reference photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-references', 'character-references', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to character references
CREATE POLICY "Public read access for character references"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-references');

-- Allow authenticated users to upload character references
CREATE POLICY "Authenticated users can upload character references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'character-references' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update character references"
ON storage.objects FOR UPDATE
USING (bucket_id = 'character-references' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete character references"
ON storage.objects FOR DELETE
USING (bucket_id = 'character-references' AND auth.role() = 'authenticated');