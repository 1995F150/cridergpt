-- Add memory_enabled column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS memory_enabled boolean DEFAULT true;