
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
    console.log('🔄 AuthProvider: Initializing auth state');
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('📡 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
        } else {
          console.log('✅ Initial session result:', session ? 'Session found' : 'No session');
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Fatal error in auth initialization:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    console.log('👂 Setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth state change:', event, session ? 'Session exists' : 'No session');
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          // Don't set loading to false here as it might interfere with initial load
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      console.log('🧹 AuthProvider: Cleaning up');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user');
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  console.log('🎨 AuthProvider render - loading:', loading, 'user:', user ? 'exists' : 'null');

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
