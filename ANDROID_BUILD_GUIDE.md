# CriderGPT Android APK Build Guide

This guide explains how to build the CriderGPT Android APK from this project.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Android Studio** (latest version)
3. **Java JDK 17** (required by Android Studio)
4. **Git** (to clone the repo)

## Step 1: Export & Clone the Project

1. In Lovable, click **"Export to GitHub"** 
2. Clone your repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

## Step 2: Install Dependencies

```bash
npm install

# Install Capacitor CLI and Android platform
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
```

## Step 3: Build the Web App

```bash
npm run build
```

This creates the `dist/` folder with your compiled web app.

## Step 4: Add Android Platform

```bash
npx cap add android
npx cap sync
```

## Step 5: Open in Android Studio

```bash
npx cap open android
```

This opens Android Studio with your project.

## Step 6: Build the APK

In Android Studio:

1. Wait for Gradle sync to complete
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Wait for the build to finish
4. Click **"locate"** in the notification to find your APK

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Step 7: Sign for Production (Optional)

For Play Store release:

1. Go to **Build > Generate Signed Bundle / APK**
2. Create or select a keystore
3. Follow the wizard to create a signed APK or AAB

## Important Notes

### Backend Connection
The APK automatically connects to your existing Supabase backend:
- **Supabase URL**: `https://udpldrrpebdyuiqdtqnq.supabase.co`
- All authentication, database, and edge functions work the same

### App Configuration
Edit `capacitor.config.ts` to customize:
- `appId`: Your unique app identifier (for Play Store)
- `appName`: Display name on device
- Splash screen colors and behavior
- Status bar styling

### Updating the App
After making changes in Lovable:

1. Export to GitHub again (or pull changes)
2. Run:
   ```bash
   npm run build
   npx cap sync
   ```
3. Rebuild in Android Studio

### Debugging
To debug the app:
1. Enable USB debugging on your Android device
2. Connect via USB
3. In Android Studio, click **Run > Run 'app'**
4. Use Chrome's `chrome://inspect` to debug the WebView

## Troubleshooting

### "SDK not found"
Set your Android SDK path in Android Studio:
**File > Project Structure > SDK Location**

### "Gradle sync failed"
Try: **File > Invalidate Caches / Restart**

### "API calls not working"
Make sure `cleartext: true` is set in `capacitor.config.ts` for development.

## Version Info
- **CriderGPT Version**: 3.7.0
- **Capacitor Version**: 6.x
- **Min Android SDK**: 22 (Android 5.1)
- **Target Android SDK**: 34 (Android 14)
