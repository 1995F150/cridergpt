import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Loader2 } from 'lucide-react';

/**
 * SHA-1-free Google Sign-In.
 *
 * Web    -> Supabase OAuth in a centered popup window (ChatGPT-style).
 * Native -> Supabase OAuth opened in an in-app Chrome Custom Tab via @capacitor/browser.
 *           The OAuth redirect comes back to `app.cridergpt.android://oauth` (deep link),
 *           Supabase parses the URL and creates the session. No GoogleAuth plugin,
 *           no Firebase, no SHA-1 fingerprint required.
 */
export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  // Listen for the deep-link callback on native after the browser tab finishes auth
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.includes('oauth') && !url.includes('access_token') && !url.includes('code=')) return;
      try {
        await Browser.close().catch(() => {});
        // Supabase v2 parses the URL fragment/query and sets the session
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.error('[oauth] exchange error', error);
        setLoading(false);
      } catch (e) {
        console.error('[oauth] callback error', e);
        setLoading(false);
      }
    });
    return () => { sub.then(s => s.remove()); };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? 'app.cridergpt.android://oauth'
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned');

      if (isNative) {
        // In-app browser tab — no SHA-1, no Firebase config needed
        await Browser.open({ url: data.url, presentationStyle: 'popover' });
        return; // session is set by the deep-link listener above
      }

      // Web popup (ChatGPT-style)
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top  = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.url, 'google-auth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );
      const check = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(check);
          setLoading(false);
          const { data: s } = await supabase.auth.getSession();
          if (s?.session) window.location.reload();
        }
      }, 500);
      setTimeout(() => { clearInterval(check); setLoading(false); }, 120000);
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
