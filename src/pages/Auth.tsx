
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔐 Auth page loaded');
    console.log('📍 Current URL:', window.location.href);
    
    // Monitor online/offline status
    const handleOnline = () => {
      console.log('📡 Connection restored');
      setIsOnline(true);
      setConnectionError(null);
    };
    
    const handleOffline = () => {
      console.log('📵 Connection lost');
      setIsOnline(false);
      setConnectionError('No internet connection detected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test Supabase connection
    const testConnection = async () => {
      try {
        console.log('🧪 Testing Supabase connection...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Connection error:', error);
          setConnectionError(`Authentication service error: ${error.message}`);
        } else if (data.session) {
          console.log('✅ Already authenticated, redirecting...');
          navigate('/', { replace: true });
        } else {
          console.log('✅ Connection successful, no active session');
          setConnectionError(null);
        }
      } catch (error) {
        console.error('💥 Failed to connect to Supabase:', error);
        setConnectionError('Unable to connect to authentication service. Please check your internet connection and try again.');
      }
    };

    // Only test connection if online
    if (isOnline) {
      testConnection();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth event:', event, session ? 'Session exists' : 'No session');
      if (session) {
        navigate('/', { replace: true });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
    };
  }, [navigate, isOnline]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setConnectionError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Check your email",
          description: "We've sent you a verification link to complete your signup.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);
      const errorMessage = error.message || 'An authentication error occurred';
      
      // Handle specific connection errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setConnectionError('Unable to connect to authentication service. Please check your internet connection.');
      } else {
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = () => {
    console.log('🔄 Retrying connection...');
    setConnectionError(null);
    window.location.reload();
  };

  // Show connection status
  if (!isOnline || connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2">
              {isOnline ? (
                <AlertCircle className="h-12 w-12 text-destructive" />
              ) : (
                <WifiOff className="h-12 w-12 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              {isOnline ? 'Connection Error' : 'No Internet Connection'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isOnline 
                ? 'Unable to connect to CriderGPT services' 
                : 'Please check your internet connection'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">
                {connectionError || 'No internet connection detected'}
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={retryConnection} className="w-full">
                <Wifi className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                If the problem persists, please check your internet connection or try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isSignUp 
              ? 'Sign up to get started with CriderGPT' 
              : 'Sign in to your CriderGPT account'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Connecting...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <GoogleSignInButton />
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
              }}
              className="text-cyber-blue hover:text-tech-accent"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
