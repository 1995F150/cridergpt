
-- Spending groups
CREATE TABLE public.spending_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.spending_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.spending_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Spending entries
CREATE TABLE public.spending_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.spending_groups(id) ON DELETE CASCADE NOT NULL,
  spent_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spent_on UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  store_location TEXT,
  note TEXT,
  spent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.spending_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to check group membership
CREATE OR REPLACE FUNCTION public.is_spending_group_member(check_user_id UUID, check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spending_group_members
    WHERE user_id = check_user_id AND group_id = check_group_id
  )
$$;

-- Groups: members can view their groups
CREATE POLICY "Members can view their groups" ON public.spending_groups
  FOR SELECT TO authenticated
  USING (public.is_spending_group_member(auth.uid(), id));

CREATE POLICY "Auth users can create groups" ON public.spending_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update group" ON public.spending_groups
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete group" ON public.spending_groups
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Members: group members can see other members
CREATE POLICY "Members can view group members" ON public.spending_group_members
  FOR SELECT TO authenticated
  USING (public.is_spending_group_member(auth.uid(), group_id));

CREATE POLICY "Auth users can join groups" ON public.spending_group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON public.spending_group_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Entries: group members can CRUD entries
CREATE POLICY "Members can view entries" ON public.spending_entries
  FOR SELECT TO authenticated
  USING (public.is_spending_group_member(auth.uid(), group_id));

CREATE POLICY "Members can add entries" ON public.spending_entries
  FOR INSERT TO authenticated
  WITH CHECK (spent_by = auth.uid() AND public.is_spending_group_member(auth.uid(), group_id));

CREATE POLICY "Users can update own entries" ON public.spending_entries
  FOR UPDATE TO authenticated
  USING (spent_by = auth.uid());

CREATE POLICY "Users can delete own entries" ON public.spending_entries
  FOR DELETE TO authenticated
  USING (spent_by = auth.uid());

-- Updated_at trigger for groups
CREATE TRIGGER update_spending_groups_updated_at
  BEFORE UPDATE ON public.spending_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow selecting groups by invite code for joining
CREATE POLICY "Anyone can find groups by invite code" ON public.spending_groups
  FOR SELECT TO authenticated
  USING (true);
