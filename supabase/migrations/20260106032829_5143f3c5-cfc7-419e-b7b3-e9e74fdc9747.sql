-- Add created_at column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Backfill created_at from auth.users for existing profiles
UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.user_id = u.id AND p.created_at IS NULL;

-- Create index for better query performance on created_at
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);