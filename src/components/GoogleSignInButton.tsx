import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Web client ID from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = '117996162498-3k9k9kdpt6elh5mdtd4sjqb2v22h4b89.apps.googleusercontent.com';

export default function GoogleSignInButton() {
  useEffect(() => {
    // Initialize GoogleAuth on native platforms
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native: Use Google's native sign-in popup (like ChatGPT)
        console.log('🔐 Starting native Google Sign-In...');
        
        const googleUser = await GoogleAuth.signIn();
        console.log('✅ Google user:', googleUser.email);
        
        // Get the ID token from the Google response
        const idToken = googleUser.authentication.idToken;
        
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }
        
        // Use Supabase's signInWithIdToken for native auth
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        
        if (error) {
          console.error('❌ Supabase auth error:', error);
          throw error;
        }
        
        console.log('✅ Successfully signed in with Supabase:', data.user?.email);
      } else {
        // Web: Use standard OAuth redirect
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        
        if (error) {
          console.error('Google sign-in error:', error.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className="w-full bg-background hover:bg-muted border-border"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
        alt="Google"
        className="w-5 h-5 mr-3"
      />
      Continue with Google
    </Button>
  );
}
