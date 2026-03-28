-- Drop the orphaned public.users table that is causing GoTrue auth callback errors
-- Table has 0 rows, no grants, RLS with no policies, and no code references
DROP TABLE IF EXISTS public.users;