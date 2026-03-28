import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ghost } from 'lucide-react';

export default function SnapchatSignInButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSnapchatSignIn = async () => {
    try {
      setLoading(true);

      // Always use published URL to match Snapchat Developer Portal redirect URI
      const redirectUri = 'https://cridergpt.lovable.app/auth';

      // Get Snapchat OAuth URL from edge function
      const { data, error } = await supabase.functions.invoke('snapchat-auth', {
        body: {
          action: 'get_auth_url',
          redirect_uri: redirectUri,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open in popup like Google sign-in
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.url,
          'snapchat-auth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
        );

        // Store state for CSRF validation
        if (data.state) {
          sessionStorage.setItem('snap_oauth_state', data.state);
        }

        // Poll for popup close or error
        const checkPopup = setInterval(async () => {
          try {
            // Check if popup navigated back to our domain with a code
            if (popup && !popup.closed) {
              try {
                const popupUrl = popup.location?.href;
                if (popupUrl?.includes(window.location.origin)) {
                  const popupParams = new URLSearchParams(new URL(popupUrl).search);
                  const code = popupParams.get('code');
                  const error = popupParams.get('error');
                  
                  if (code) {
                    clearInterval(checkPopup);
                    popup.close();
                    setLoading(false);
                    await exchangeSnapchatCode(code, redirectUri);
                    return;
                  }
                  if (error) {
                    clearInterval(checkPopup);
                    popup.close();
                    setLoading(false);
                    toast({
                      title: 'Snapchat Login Failed',
                      description: 'Authorization was denied or an error occurred. Please try again.',
                      variant: 'destructive',
                    });
                    return;
                  }
                }
              } catch {
                // Cross-origin - popup still on Snapchat domain, keep waiting
              }
            }
          } catch {
            // Ignore cross-origin errors
          }

          if (popup?.closed) {
            clearInterval(checkPopup);
            setLoading(false);
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkPopup);
          if (popup && !popup.closed) popup.close();
          setLoading(false);
        }, 120000);
      }
    } catch (error: any) {
      console.error('Snapchat sign-in error:', error);
      toast({
        title: 'Snapchat Login Error',
        description: error.message || 'Failed to connect with Snapchat',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const exchangeSnapchatCode = async (code: string, redirectUri: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('snapchat-auth', {
        body: { action: 'exchange_code', code, redirect_uri: redirectUri },
      });

      if (error) throw error;

      if (data?.display_name || data?.bitmoji_url) {
        // Store Snapchat profile data in localStorage for profile use
        localStorage.setItem('snap_display_name', data.display_name || '');
        localStorage.setItem('snap_bitmoji_url', data.bitmoji_url || '');
        localStorage.setItem('snap_external_id', data.external_id || '');

        toast({
          title: 'Snapchat Connected! 👻',
          description: `Welcome, ${data.display_name || 'Snapchatter'}! Your Bitmoji is now your avatar.`,
        });

        // Update profile with Bitmoji if user is authenticated
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          await supabase
            .from('profiles')
            .update({
              avatar_url: data.bitmoji_url,
              snapchat_display_name: data.display_name,
              snapchat_external_id: data.external_id,
            } as any)
            .eq('user_id', session.session.user.id);
        }
      }
    } catch (error: any) {
      console.error('Snapchat code exchange error:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not complete Snapchat login. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={handleSnapchatSignIn}
      variant="outline"
      className="w-full bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 border-[#FFFC00]/30 text-foreground"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
      ) : (
        <Ghost className="w-5 h-5 mr-3 text-[#FFFC00]" />
      )}
      {loading ? 'Connecting...' : 'Continue with Snapchat'}
    </Button>
  );
}
