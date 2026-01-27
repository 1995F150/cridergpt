# CriderGPT Android APK Build Guide

This guide explains how to build the CriderGPT Android APK from this project with all features working: **Google Sign-In**, **Push Notifications**, and **Safe-Area UI**.

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
npm install @capacitor/app
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

---

## Step 5: Configure AndroidManifest.xml (CRITICAL)

Open `android/app/src/main/AndroidManifest.xml` and add the following:

### 5a. Permissions (before `<application>` tag)

```xml
<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Network -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Optional: Camera/Storage for future features -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 5b. Google Sign-In Deep Link (inside `<activity>` tag for MainActivity)

Add this intent filter **inside** the main `<activity>` block (after any existing `<intent-filter>` blocks):

```xml
<!-- Google OAuth Deep Link Handler -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="app.cridergpt.android" android:host="auth-callback" />
</intent-filter>
```

### 5c. Full-Screen / Edge-to-Edge Display (optional)

For proper safe-area handling with notches/status bars, add to `<activity>`:

```xml
android:windowSoftInputMode="adjustResize"
```

---

## Step 6: Configure Supabase Redirect URL

In your **Supabase Dashboard** → **Authentication** → **URL Configuration**:

Add this to **Redirect URLs**:
```
app.cridergpt.android://auth-callback
```

---

## Step 7: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Ensure you have an **Android OAuth Client ID** with:
   - Package name: `app.cridergpt.android`
   - SHA-1 fingerprint from your keystore

> **Note:** Android OAuth clients do NOT need redirect URIs—they use the package name + SHA-1 for verification.

---

## Step 8: Open in Android Studio

```bash
npx cap open android
```

Wait for Gradle sync to complete.

---

## Step 9: Build the APK

In Android Studio:

1. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for the build to finish
3. Click **"locate"** in the notification to find your APK

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 10: Sign for Production (Optional)

For Play Store release:

1. Go to **Build > Generate Signed Bundle / APK**
2. Create or select a keystore
3. Follow the wizard to create a signed APK or AAB

---

## Features Included

### ✅ Google Sign-In
- Deep link handler in `App.tsx` captures OAuth redirects
- `GoogleSignInButton.tsx` uses custom scheme for mobile
- Intent filter in AndroidManifest intercepts `app.cridergpt.android://auth-callback`

### ✅ Push Notifications
- Uses Web Push API via `useBrowserNotifications.ts`
- Notification permission requested on first launch
- Supports: AI responses, calendar events, image generation, task reminders, admin broadcasts

### ✅ Safe-Area UI
- Header uses `--safe-top` CSS variable to avoid status bar overlap
- Works with notched phones and Android navigation bars

### ✅ Offline Support
- Service Worker (`public/sw.js`) caches static assets
- Offline fallback page at `/offline.html`
- Network-first strategy ensures fresh updates

---

## Updating the App

After making changes in Lovable:

1. Export to GitHub again (or pull changes)
2. Run:
   ```bash
   npm run build
   npx cap sync
   ```
3. Rebuild in Android Studio

---

## Debugging

### USB Debugging
1. Enable USB debugging on your Android device
2. Connect via USB
3. In Android Studio, click **Run > Run 'app'**
4. Use Chrome's `chrome://inspect` to debug the WebView

### Common Issues

| Issue | Solution |
|-------|----------|
| SDK not found | Set Android SDK path in **File > Project Structure > SDK Location** |
| Gradle sync failed | **File > Invalidate Caches / Restart** |
| Google Sign-In loops | Verify intent filter is inside `<activity>`, not outside |
| Login button overlaps status bar | Ensure latest code has `pt-[var(--safe-top)]` on Header |
| Notifications not working | Check `POST_NOTIFICATIONS` permission in manifest |

---

## Version Info

- **CriderGPT Version**: 4.9.9
- **Capacitor Version**: 6.x
- **Min Android SDK**: 22 (Android 5.1)
- **Target Android SDK**: 34 (Android 14)
