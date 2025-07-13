-- Check if RLS is enabled and fix the policies
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
WHERE c.relname = 'user_updates';

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their own updates" ON public.user_updates;
DROP POLICY IF EXISTS "Users can insert their own updates" ON public.user_updates;
DROP POLICY IF EXISTS "Service role can insert updates" ON public.user_updates;

-- Ensure RLS is enabled
ALTER TABLE public.user_updates ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
CREATE POLICY "Users can view their own updates" 
ON public.user_updates 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own updates" 
ON public.user_updates 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert updates (for system updates)
CREATE POLICY "Service role can insert updates" 
ON public.user_updates 
FOR INSERT 
TO service_role
WITH CHECK (true);