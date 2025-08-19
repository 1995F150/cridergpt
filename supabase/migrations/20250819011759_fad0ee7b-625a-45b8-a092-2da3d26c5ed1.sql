
-- Fix RLS policies that may have issues

-- 1. Fix the checkout_sessions table - it has duplicate SELECT policies
DROP POLICY IF EXISTS "Users can only view their own checkout sessions" ON public.checkout_sessions;

-- Keep only the more specific policy
-- The "Allow users to view their own checkout sessions" policy is better

-- 2. Fix the user_subscriptions_backup table - it has duplicate SELECT policies  
DROP POLICY IF EXISTS "view_own_subscription" ON public.user_subscriptions_backup;

-- Keep the "Users can view their own subscription" policy

-- 3. Fix the usage_log table - the admin policy has circular reference
DROP POLICY IF EXISTS "admin_manage_usage_logs" ON public.usage_log;

-- Create a proper admin policy using a function approach
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user is an admin based on email or role
    -- This is a placeholder - adjust based on your admin identification logic
    RETURN EXISTS (
        SELECT 1 FROM public.system_owners 
        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new admin policy for usage_log
CREATE POLICY "admin_can_manage_usage_logs" ON public.usage_log
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Fix the system_owners table policy - CURRENT_USER may not work as expected
DROP POLICY IF EXISTS "Owners can manage owner records" ON public.system_owners;

CREATE POLICY "Owners can manage owner records" ON public.system_owners
FOR ALL USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
)
WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5. Fix the founders table policy - create a proper function
CREATE OR REPLACE FUNCTION public.is_founder(check_email text DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF check_email IS NULL THEN
        check_email := (SELECT email FROM auth.users WHERE id = auth.uid());
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.founders 
        WHERE email = check_email 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update founders policy to be more explicit
DROP POLICY IF EXISTS "Founders can manage founder records" ON public.founders;

CREATE POLICY "Founders can manage founder records" ON public.founders
FOR ALL USING (public.is_founder())
WITH CHECK (public.is_founder());

-- 6. Fix the system_info table - the "Anonymous users cannot access" policy is redundant
DROP POLICY IF EXISTS "Anonymous users cannot access" ON public.system_info;

-- The existing "Authenticated users can view all rows" policy is sufficient

-- 7. Add missing INSERT/UPDATE/DELETE policies for some tables that only have SELECT

-- For api_keys table - add basic CRUD policies
CREATE POLICY "Users can view their own api_keys" ON public.api_keys
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own api_keys" ON public.api_keys
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own api_keys" ON public.api_keys
FOR DELETE USING (user_id = auth.uid());

-- 8. Fix creator_interactions table - it has a circular policy
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.creator_interactions;

CREATE POLICY "Admins can view all interactions" ON public.creator_interactions
FOR SELECT USING (public.is_admin());

-- Allow service role to insert interactions (for when users submit feedback)
CREATE POLICY "Service role can insert interactions" ON public.creator_interactions
FOR INSERT WITH CHECK (true);

-- 9. Ensure proper policies for user_agreements table
CREATE POLICY "Users can accept agreements" ON public.user_agreements
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 10. Fix potential issues with memory-related policies that reference profiles_old
-- The memories table has complex policies referencing profiles_old which may not exist
DROP POLICY IF EXISTS "Users can view their own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can update their own memories" ON public.memories;
DROP POLICY IF EXISTS "Users can delete their own memories" ON public.memories;

-- Create simpler, more direct policies for memories
CREATE POLICY "Users can view their own memories" ON public.memories
FOR SELECT USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can insert their own memories" ON public.memories
FOR INSERT WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own memories" ON public.memories
FOR UPDATE USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can delete their own memories" ON public.memories
FOR DELETE USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
