import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * SHA-1-free Google Sign-In (web/PWA only).
 *
 * The native Android app (Kotlin) and native iOS app (Swift) implement their
 * own Google Sign-In flow with Chrome Custom Tabs / ASWebAuthenticationSession
 * and deep-link back into the native shell. This component only runs in the
 * browser bundle, so we use a centered popup (ChatGPT-style) — no Capacitor.
 */
export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned');

      // Web popup (ChatGPT-style)
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.url,
        'google-auth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
      );
      const check = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(check);
          setLoading(false);
          const { data: s } = await supabase.auth.getSession();
          if (s?.session) window.location.reload();
        }
      }, 500);
      setTimeout(() => {
        clearInterval(check);
        setLoading(false);
      }, 120000);
    } catch (err) {
      console.error('Google sign-in error', err);
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className="w-full bg-background hover:bg-muted border-border"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
      ) : (
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
          alt="Google"
          className="w-5 h-5 mr-3"
        />
      )}
      {loading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}
