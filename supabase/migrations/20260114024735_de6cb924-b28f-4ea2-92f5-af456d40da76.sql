-- =============================================
-- FIX CRITICAL SECURITY VULNERABILITIES
-- =============================================

-- 1. Fix crider_chat_users - Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all crider chat users" ON crider_chat_users;

-- Create proper policies for crider_chat_users
-- Users can only view their own profile
CREATE POLICY "Users can view their own crider profile" 
ON crider_chat_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can view profiles of people they're friends with
CREATE POLICY "Users can view friends crider profiles" 
ON crider_chat_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE (friendships.user1_id = auth.uid() AND friendships.user2_id = crider_chat_users.user_id)
       OR (friendships.user2_id = auth.uid() AND friendships.user1_id = crider_chat_users.user_id)
  )
);

-- 2. Fix founders table - Add restrictive SELECT policy
CREATE POLICY "Only admins can view founders" 
ON founders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);