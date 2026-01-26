import type { CapacitorConfig } from '@anthropic/capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cridergpt.android',
  appName: 'CriderGPT',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    cleartext: true
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
