-- Add remaining RLS policies (skip the one that already exists)
DO $$ 
BEGIN
  -- Add RLS policy for authenticated uploads (admin only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin upload access for character references' AND tablename = 'objects') THEN
    CREATE POLICY "Admin upload access for character references"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'character-references' AND auth.role() = 'authenticated');
  END IF;

  -- Add RLS policy for authenticated updates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin update access for character references' AND tablename = 'objects') THEN
    CREATE POLICY "Admin update access for character references"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'character-references' AND auth.role() = 'authenticated');
  END IF;

  -- Add RLS policy for authenticated deletes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin delete access for character references' AND tablename = 'objects') THEN
    CREATE POLICY "Admin delete access for character references"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'character-references' AND auth.role() = 'authenticated');
  END IF;
END $$;