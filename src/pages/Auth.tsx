import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';

// User Agreement
const AGREEMENT_BASE64 = "Q3JpZGVyT1MgVXNlciBBZ3JlZW1lbnQKCkVmZmVjdGl2ZSBEYXRlOiBKYW51YXJ5IDEsIDIwMjUKClRoaXMgVXNlciBBZ3JlZW1lbnQgKCJBZ3JlZW1lbnQiKSBpcyBlbnRlcmVkIGludG8gYnkgYW5kIGJldHdlZW4geW91ICgiVXNlciIpIGFuZCBDcmlkZXJPUyAoIkNvbXBhbnkiKS4gQnkgdXNpbmcgQ3JpZGVyT1MsIHlvdSBhZ3JlZSB0byBiZSBib3VuZCBieSB0aGUgdGVybXMgYW5kIGNvbmRpdGlvbnMgb2YgdGhpcyBBZ3JlZW1lbnQuCgoxLiBBY2NlcHRhbmNlIG9mIFRlcm1zCkJ5IGFjY2Vzc2luZyBvciB1c2luZyBDcmlkZXJPUywgeW91IGFncmVlIHRvIGNvbXBseSB3aXRoIGFuZCBiZSBib3VuZCBieSB0aGlzIEFncmVlbWVudC4KCjIuIERlc2NyaXB0aW9uIG9mIFNlcnZpY2UKQ3JpZGVyT1MgaXMgYSBjb21wdXRlciBvcGVyYXRpbmcgc3lzdGVtIGFuZCBzb2Z0d2FyZSBwbGF0Zm9ybSBkZXNpZ25lZCB0byBwcm92aWRlIHVzZXJzIHdpdGggYWR2YW5jZWQgY29tcHV0aW5nIGNhcGFiaWxpdGllcy4KCjMuIFVzZXIgUmVzcG9uc2liaWxpdGllcwpZb3UgYWdyZWUgdG86Ci0gVXNlIENyaWRlck9TIGluIGFjY29yZGFuY2Ugd2l0aCBhbGwgYXBwbGljYWJsZSBsYXdzIGFuZCByZWd1bGF0aW9ucwotIE5vdCBlbmdhZ2UgaW4gYW55IGlsbGVnYWwgb3IgaGFybWZ1bCBhY3Rpdml0aWVzCi0gTWFpbnRhaW4gdGhlIHNlY3VyaXR5IG9mIHlvdXIgYWNjb3VudCBhbmQgcGFzc3dvcmQKCjQuIERhdGEgUHJpdmFjeQpXZSByZXNwZWN0IHlvdXIgcHJpdmFjeSBhbmQgYXJlIGNvbW1pdHRlZCB0byBwcm90ZWN0aW5nIHlvdXIgcGVyc29uYWwgaW5mb3JtYXRpb24uCgo1LiBMaW1pdGF0aW9uIG9mIExpYWJpbGl0eQpDcmlkZXJPUyBzaGFsbCBub3QgYmUgbGlhYmxlIGZvciBhbnkgaW5kaXJlY3QsIGluY2lkZW50YWwsIHNwZWNpYWwsIG9yIGNvbnNlcXVlbnRpYWwgZGFtYWdlcy4KCjYuIFRlcm1pbmF0aW9uCkVpdGhlciBwYXJ0eSBtYXkgdGVybWluYXRlIHRoaXMgQWdyZWVtZW50IGF0IGFueSB0aW1lIHdpdGggb3Igd2l0aG91dCBub3RpY2UuCgo3LiBHb3Zlcm5pbmcgTGF3ClRoaXMgQWdyZWVtZW50IHNoYWxsIGJlIGdvdmVybmVkIGJ5IGFuZCBjb25zdHJ1ZWQgaW4gYWNjb3JkYW5jZSB3aXRoIHRoZSBsYXdzIG9mIFtZb3VyIEp1cmlzZGljdGlvbl0uCgo4LiBBbWVuZG1lbnRzCkNyaWRlck9TIHJlc2VydmVzIHRoZSByaWdodCB0byBtb2RpZnkgdGhpcyBBZ3JlZW1lbnQgYXQgYW55IHRpbWUuCgpCeSBjbGlja2luZyAiSSBBY2NlcHQiLCB5b3UgYWNrbm93bGVkZ2UgdGhhdCB5b3UgaGF2ZSByZWFkLCB1bmRlcnN0b29kLCBhbmQgYWdyZWUgdG8gYmUgYm91bmQgYnkgdGhpcyBBZ3JlZW1lbnQu";
const AGREEMENT_VERSION = "1.0.0";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check URL params for agreement acceptance
    const urlParams = new URLSearchParams(window.location.search);
    const agreementAccepted = urlParams.get('agreementAccepted');
    const emailParam = urlParams.get('email');
    
    if (agreementAccepted === 'true' && emailParam) {
      setEmail(emailParam);
      toast({
        title: "Agreement Accepted",
        description: "You can now complete your signup.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/auth');
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if this is a signup and we need agreement
    if (isSignUp) {
      // Check if agreement was already accepted for this email
      const { data: existingAgreement } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_email', email)
        .eq('agreement_version', AGREEMENT_VERSION)
        .maybeSingle();

      if (!existingAgreement) {
        // Redirect to agreement page
        navigate(`/agreement?email=${encodeURIComponent(email)}&returnTo=/auth`);
        return;
      }
    }
    
    setLoading(true);

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
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isSignUp 
              ? 'Sign up to get started with CriderOS' 
              : 'Sign in to your CriderOS account'
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
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
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