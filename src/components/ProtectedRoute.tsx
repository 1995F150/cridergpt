
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log('🛡️ ProtectedRoute render - loading:', loading, 'user:', user ? 'exists' : 'null');

  useEffect(() => {
    console.log('🔍 ProtectedRoute useEffect - loading:', loading, 'user:', user ? 'exists' : 'null');
    
    if (!loading && !user) {
      console.log('🚨 No user found, redirecting to auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('⏳ ProtectedRoute: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading CriderGPT...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user, returning null (should redirect)');
    return null;
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
}
