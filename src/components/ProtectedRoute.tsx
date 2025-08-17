
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, connectionError } = useAuth();
  const navigate = useNavigate();

  console.log('🛡️ ProtectedRoute render - loading:', loading, 'user:', user ? 'exists' : 'null', 'error:', connectionError);

  useEffect(() => {
    if (!loading && !user && !connectionError) {
      console.log('🚨 No user found, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate, connectionError]);

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

  if (connectionError) {
    console.log('🔌 ProtectedRoute: Showing connection error');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Connection Error</CardTitle>
            <CardDescription>
              Unable to connect to CriderGPT services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{connectionError}</p>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Retry Connection
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: No user, should redirect');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
}
