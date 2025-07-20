-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true);

-- Create storage policies for chat images
CREATE POLICY "Users can upload their own chat images"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own chat images"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Chat images are publicly readable"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete their own chat images"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_url column to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN image_url TEXT;