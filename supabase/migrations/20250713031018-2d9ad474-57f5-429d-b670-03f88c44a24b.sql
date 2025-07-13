-- Ensure the user-files storage bucket exists and is properly configured
DO $$
BEGIN
    -- Check if bucket exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-files') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false);
    END IF;
END
$$;

-- Create storage policies for user files
CREATE POLICY "Users can upload their own files" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects 
FOR SELECT USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);