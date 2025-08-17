
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  connectionError: string | null;
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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 AuthProvider: Initializing auth state');
    
    const initializeAuth = async () => {
      try {
        console.log('📡 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          setConnectionError(`Authentication service error: ${error.message}`);
        } else {
          console.log('✅ Initial session result:', session ? 'Session found' : 'No session');
          setConnectionError(null);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('💥 Fatal error in auth initialization:', error);
        setConnectionError('Unable to connect to authentication service. Please check your connection.');
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    console.log('👂 Setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth state change:', event, session ? 'Session exists' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear connection error on successful auth state change
        if (session) {
          setConnectionError(null);
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      console.log('🧹 AuthProvider: Cleaning up');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user');
      setLoading(true);
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Force redirect even if signout fails
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  console.log('🎨 AuthProvider render - loading:', loading, 'user:', user ? 'exists' : 'null', 'error:', connectionError);

  const value = {
    user,
    session,
    loading,
    signOut,
    connectionError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
