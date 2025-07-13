-- Test the RLS policies by checking if they exist and are correct
-- First, let's see the exact RLS policies on user_updates table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_updates';