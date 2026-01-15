import type { CapacitorConfig } from '@anthropic/capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cridergpt.android',
  appName: 'CriderGPT',
  webDir: 'dist',
  
  // Use the built web app files (connects to your existing Supabase backend)
  server: {
    // For development, you can use your live URL:
    // url: 'https://cridergpt.lovable.app',
    
    // For production APK, leave this commented out - it will use local files
    // that still make API calls to your Supabase backend
    androidScheme: 'https',
    cleartext: true // Allow HTTP for local development
  },
  
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true // Disable in production
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      spinnerColor: '#1f8b4c'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
