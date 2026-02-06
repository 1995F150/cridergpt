import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DeveloperCommand {
  step?: number;
  name: string;
  command: string;
}

interface DeveloperCommands {
  android_build: DeveloperCommand[];
  maintenance: DeveloperCommand[];
  signing: DeveloperCommand[];
  git: DeveloperCommand[];
  supabase: DeveloperCommand[];
}

interface DeveloperVerification {
  verified: boolean;
  email?: string;
  is_founder?: boolean;
  is_system_owner?: boolean;
  is_admin?: boolean;
  role?: string;
  permissions?: Record<string, unknown>;
  verified_at?: string;
  reason?: string;
  commands?: DeveloperCommands;
}

interface UseDeveloperModeReturn {
  isDeveloper: boolean;
  isLoading: boolean;
  verification: DeveloperVerification | null;
  commands: DeveloperCommands | null;
  error: string | null;
  verifyDeveloper: () => Promise<boolean>;
}

export function useDeveloperMode(): UseDeveloperModeReturn {
  const { user } = useAuth();
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verification, setVerification] = useState<DeveloperVerification | null>(null);
  const [commands, setCommands] = useState<DeveloperCommands | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyDeveloper = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Must be logged in to verify developer status');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_developer', {
        check_user_id: user.id
      });

      if (rpcError) {
        console.error('Developer verification error:', rpcError);
        setError(rpcError.message);
        setIsDeveloper(false);
        return false;
      }

      const result = data as unknown as DeveloperVerification;
      setVerification(result);
      setIsDeveloper(result?.verified === true);

      // If verified, set default commands (edge function not available due to limits)
      if (result?.verified) {
        setCommands(getDefaultCommands());
      }

      return result?.verified === true;
    } catch (err) {
      console.error('Verification failed:', err);
      setError('Failed to verify developer status');
      setIsDeveloper(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-verify on mount if user is logged in
  useEffect(() => {
    if (user) {
      verifyDeveloper();
    } else {
      setIsDeveloper(false);
      setVerification(null);
      setCommands(null);
    }
  }, [user, verifyDeveloper]);

  return {
    isDeveloper,
    isLoading,
    verification,
    commands,
    error,
    verifyDeveloper
  };
}

// Default commands if edge function isn't available
function getDefaultCommands(): DeveloperCommands {
  return {
    android_build: [
      { step: 1, name: 'Clone & Install', command: 'git clone https://github.com/1995F150/cridergpt.git && cd cridergpt && npm install' },
      { step: 2, name: 'Install Capacitor', command: 'npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app @codetrix-studio/capacitor-google-auth' },
      { step: 3, name: 'Build Project', command: 'npm run build' },
      { step: 4, name: 'Add Android Platform', command: 'npx cap add android' },
      { step: 5, name: 'Sync to Android', command: 'npx cap sync android' },
      { step: 6, name: 'Open Android Studio', command: 'npx cap open android' },
      { step: 7, name: 'Run on Device', command: 'npx cap run android' },
    ],
    maintenance: [
      { name: 'Quick Build & Sync', command: 'npm run build && npx cap sync android' },
      { name: 'Full Setup (Build + Sync + Open)', command: 'npm run build && npx cap sync android && npx cap open android' },
      { name: 'Check Issues', command: 'npm run lint' },
      { name: 'Update Dependencies', command: 'npm update' },
      { name: 'Capacitor Doctor', command: 'npx cap doctor' },
      { name: 'Clear Cache & Rebuild', command: 'rm -rf node_modules dist && npm install && npm run build' },
      { name: 'View Android Logs', command: 'adb logcat' },
      { name: 'List Connected Devices', command: 'adb devices' },
    ],
    signing: [
      { name: 'SHA-1 (Windows CMD)', command: 'keytool -list -v -keystore %USERPROFILE%\\.android\\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>nul | findstr SHA1' },
      { name: 'SHA-1 (Mac/Linux)', command: 'keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep SHA1' },
      { name: 'All Fingerprints (Gradle)', command: 'cd android && ./gradlew signingReport' },
      { name: 'Full Debug Keystore Info', command: 'keytool -list -v -keystore %USERPROFILE%\\.android\\debug.keystore -alias androiddebugkey -storepass android -keypass android' },
    ],
    git: [
      { name: 'Pull Latest', command: 'git pull origin main' },
      { name: 'Check Status', command: 'git status' },
      { name: 'Commit All Changes', command: 'git add . && git commit -m "Update"' },
      { name: 'Push to Remote', command: 'git push origin main' },
    ],
    supabase: [
      { name: 'Generate Types', command: 'npx supabase gen types typescript --project-id udpldrrpebdyuiqdtqnq > src/integrations/supabase/types.ts' },
      { name: 'Deploy Functions', command: 'npx supabase functions deploy' },
      { name: 'View Function Logs', command: 'npx supabase functions logs' },
    ]
  };
}
