
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
import SnapchatSignInButton from '@/components/SnapchatSignInButton';
import GitHubSignInButton from '@/components/GitHubSignInButton';
import TwitterSignInButton from '@/components/TwitterSignInButton';
import SpotifySignInButton from '@/components/SpotifySignInButton';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔐 Auth page loaded');
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Simple session check - supabase client has hardcoded config
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ Session error:', error);
          // Only show error for actual connection issues, not missing session
          if (error.message?.includes('network') || error.message?.includes('fetch')) {
            setAuthError('Unable to connect to authentication service');
          } else {
            setAuthError(null);
          }
        } else if (session) {
          console.log('✅ Session found, redirecting...');
          navigate('/', { replace: true });
          return;
        } else {
          console.log('✅ No session, showing auth form');
          setAuthError(null);
        }
      } catch (error: any) {
        console.error('💥 Auth initialization error:', error);
        if (mounted && (error.message?.includes('network') || error.message?.includes('fetch'))) {
          setAuthError('Network error. Please check your connection.');
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth event:', event);
      if (session && mounted) {
        navigate('/', { replace: true });
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAuthError(null);

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
      
      let errorMessage = error.message || 'An authentication error occurred';
      
      // Handle specific error cases
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setAuthError('Network connection error. Please check your internet connection.');
        return;
      }
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // Show loading state during initialization
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin text-primary" />
            <CardTitle className="text-2xl font-bold">
              Loading CriderGPT
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Please wait while we initialize the application...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show error state if there's a connection issue
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
            <CardTitle className="text-2xl font-bold text-destructive">
              Connection Error
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Unable to connect to CriderGPT services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{authError}</p>
            </div>
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
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
                autoComplete="email"
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
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
          <GitHubSignInButton />
          <TwitterSignInButton />
          <SpotifySignInButton />
          <SnapchatSignInButton />
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
                setAuthError(null);
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
