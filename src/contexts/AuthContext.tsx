import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user just signed in, refresh their subscription status
        if (event === 'SIGNED_IN' && session?.user) {
          refreshUserSubscription(session.user.id);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Refresh subscription status on initial load
      if (session?.user) {
        refreshUserSubscription(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUserSubscription = async (userId: string) => {
    try {
      // Try to refresh subscription status from Stripe
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          }
        });
      }
    } catch (error) {
      console.log('Subscription check failed (this is normal for free users):', error);
    }
  };

  const signOut = async () => {
    try {
      // Clear any local storage items if needed
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload to ensure clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};