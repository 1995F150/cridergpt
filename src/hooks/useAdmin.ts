import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

interface AdminState {
  isAdmin: boolean;
  isModerator: boolean;
  role: AppRole | null;
  loading: boolean;
}

export function useAdmin(): AdminState {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    isModerator: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    async function checkRole() {
      if (!user) {
        setState({ isAdmin: false, isModerator: false, role: null, loading: false });
        return;
      }

      try {
        // Check admin role using has_role RPC function
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        // Check moderator role
        const { data: isModerator } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator'
        });

        let role: AppRole | null = null;
        if (isAdmin) role = 'admin';
        else if (isModerator) role = 'moderator';
        else role = 'user';

        setState({
          isAdmin: !!isAdmin,
          isModerator: !!isModerator,
          role,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking admin role:', error);
        setState({ isAdmin: false, isModerator: false, role: null, loading: false });
      }
    }

    checkRole();
  }, [user]);

  return state;
}
