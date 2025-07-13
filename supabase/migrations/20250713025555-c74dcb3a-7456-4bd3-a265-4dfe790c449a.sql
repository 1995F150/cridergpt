-- Enable real-time for openai_requests table
ALTER TABLE public.openai_requests REPLICA IDENTITY FULL;

-- Enable real-time for text_to_speech_requests table  
ALTER TABLE public.text_to_speech_requests REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.openai_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.text_to_speech_requests;