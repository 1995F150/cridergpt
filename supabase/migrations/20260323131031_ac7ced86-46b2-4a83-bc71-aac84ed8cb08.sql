-- Fix: Create trigger for initialize_new_user (profile creation on signup)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_new_user();

-- Fix: RLS insert policy uses wrong column (id instead of user_id)
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix: RLS select policy uses wrong column
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Fix: RLS update policy uses wrong column  
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);