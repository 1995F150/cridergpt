-- Create secure function to verify if user is the verified developer/owner
-- This checks founders table, system_owners table, and admin role
CREATE OR REPLACE FUNCTION public.verify_developer(check_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_founder boolean := false;
  is_system_owner boolean := false;
  is_admin boolean := false;
  owner_role text;
  owner_permissions jsonb;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = check_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'verified', false,
      'reason', 'User not found'
    );
  END IF;
  
  -- Check if user is in founders table and active
  SELECT EXISTS (
    SELECT 1 FROM public.founders
    WHERE email = user_email
    AND is_active = true
  ) INTO is_founder;
  
  -- Check if user is in system_owners table
  SELECT 
    EXISTS (
      SELECT 1 FROM public.system_owners
      WHERE email = user_email
      AND is_active = true
    ),
    (SELECT role FROM public.system_owners WHERE email = user_email AND is_active = true LIMIT 1),
    (SELECT permissions FROM public.system_owners WHERE email = user_email AND is_active = true LIMIT 1)
  INTO is_system_owner, owner_role, owner_permissions;
  
  -- Check if user has admin role
  SELECT public.has_role(check_user_id, 'admin') INTO is_admin;
  
  -- Must meet ALL conditions: founder + system_owner + admin
  IF is_founder AND is_system_owner AND is_admin THEN
    RETURN jsonb_build_object(
      'verified', true,
      'email', user_email,
      'is_founder', is_founder,
      'is_system_owner', is_system_owner,
      'is_admin', is_admin,
      'role', owner_role,
      'permissions', owner_permissions,
      'verified_at', now()
    );
  ELSE
    RETURN jsonb_build_object(
      'verified', false,
      'reason', 'Insufficient permissions',
      'is_founder', is_founder,
      'is_system_owner', is_system_owner,
      'is_admin', is_admin
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_developer TO authenticated;