import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function TwitterSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleTwitterSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.url,
          'twitter-auth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
        );

        const checkPopup = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setLoading(false);
            const { data: session } = await supabase.auth.getSession();
            if (session?.session) {
              window.location.reload();
            }
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkPopup);
          setLoading(false);
        }, 120000);
      }
    } catch (error: any) {
      console.error('X sign-in error:', error);
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTwitterSignIn}
      variant="outline"
      className="w-full bg-background hover:bg-muted border-border"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
      ) : (
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )}
      {loading ? 'Signing in...' : 'Continue with X'}
    </Button>
  );
}
