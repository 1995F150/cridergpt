-- Enable real-time for system_updates table
ALTER TABLE public.system_updates REPLICA IDENTITY FULL;

-- Add system_updates table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_updates;