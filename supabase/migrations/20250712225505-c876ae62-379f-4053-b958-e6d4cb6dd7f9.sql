-- Enable real-time for openai_requests table
ALTER TABLE public.openai_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.openai_requests;

-- Enable real-time for text_to_speech_requests table  
ALTER TABLE public.text_to_speech_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.text_to_speech_requests;