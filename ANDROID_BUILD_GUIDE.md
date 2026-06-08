# CriderGPT Android APK Build Guide

This guide explains how to build the CriderGPT Android APK with all features working: **Google Sign-In**, **Push Notifications**, **Safe-Area UI**, and **Google Play Billing for all digital upgrades** (Stripe is only used for physical products like Smart Tags).

> ⚠️ **Play Store policy reminder (2026):** All digital goods, subscriptions, and the Lifetime plan MUST use Google Play Billing inside the Android build. Stripe is allowed ONLY for physical merchandise (Smart Tags, hardware). The in-app Pricing screen now auto-detects Capacitor and routes through `useInAppPurchase` on Android — do NOT revert it to a direct `create-checkout` call or the app will be rejected.

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

# Install native Google Sign-In plugin (for ChatGPT-like popup)
npm install @codetrix-studio/capacitor-google-auth
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

## Step 7: Configure Google Cloud Console (CRITICAL for Native Sign-In)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Create TWO OAuth Client IDs:

### 7a. Web Client ID (Required for Supabase)
- Application type: **Web application**
- Name: `CriderGPT Web`
- Authorized JavaScript origins: `https://cridergpt.lovable.app`
- Authorized redirect URIs: `https://udpldrrpebdyuiqdtqnq.supabase.co/auth/v1/callback`
- **Copy this Client ID** - it's used in `GoogleSignInButton.tsx`

### 7b. Android Client ID (Required for Native Sign-In)
- Application type: **Android**
- Package name: `app.cridergpt.android`
- SHA-1 fingerprint: Use one of the automated methods below

#### Automated SHA-1 Extraction

**Option A — Windows CMD (fastest):**
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>nul | findstr SHA1
```

**Option B — Mac/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep SHA1
```

**Option C — Gradle signingReport (works everywhere, recommended by Google):**
```bash
cd android
./gradlew signingReport
```
This prints ALL fingerprints (SHA-1, SHA-256, MD5) for both debug and release keystores automatically.

---

## Step 8: Configure capacitor-google-auth Plugin

After running `npx cap add android`, edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">CriderGPT</string>
    <string name="server_client_id">YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com</string>
</resources>
```

---

## Step 9: Open in Android Studio

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

### ✅ Native Google Sign-In (ChatGPT-style)
- Uses `@codetrix-studio/capacitor-google-auth` for native popup
- No browser redirect—account picker appears in-app
- `GoogleSignInButton.tsx` detects platform and uses native flow on Android
- Uses `supabase.auth.signInWithIdToken()` with Google's ID token

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
- **capacitor-google-auth Version**: 3.x
- **Min Android SDK**: 22 (Android 5.1)
- **Target Android SDK**: 34 (Android 14)

---

## Step 11: Google Play Billing Setup (REQUIRED before publishing)

The Pricing screen in the app calls `useInAppPurchase().purchaseProduct(productId)` automatically on Android. You must register matching products in the Play Console for the purchase sheet to open.

### 11a. Install the billing plugin

```bash
npm install @capacitor-community/in-app-purchases
# or, if you prefer the cordova bridge:
# npm install cordova-plugin-purchase
npx cap sync android
```

### 11b. Create the products in Play Console

In **Play Console → Monetize → Products**, create these exact IDs (they match the map in `src/components/Pricing.tsx` and `src/hooks/useInAppPurchase.ts`):

| Plan | Type | Product ID |
|------|------|------------|
| Plus | Subscription (monthly) | `com.cridergpt.plus.monthly` |
| Pro  | Subscription (monthly) | `com.cridergpt.pro.monthly` |
| Lifetime | One-time (managed) | `com.cridergpt.lifetime` |
| 100 credits  | Consumable | `com.cridergpt.credits.100` |
| 500 credits  | Consumable | `com.cridergpt.credits.500` |
| 1000 credits | Consumable | `com.cridergpt.credits.1000` |

### 11c. Verify on the backend

The `verify-iap` Supabase edge function already validates Play purchase tokens against the Google Play Developer API. Confirm these secrets are set:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — service-account JSON with **Android Publisher** read access
- `GOOGLE_PLAY_PACKAGE_NAME` — must equal `app.cridergpt.android`

### 11d. What still uses Stripe (and that's OK)

- **`/store` (Smart Tags / merch)** — physical goods are exempt from Play Billing, Stripe is allowed and remains active.
- **Web build at https://cridergpt.com** — Stripe still handles all upgrades. The platform check inside `useInAppPurchase` falls back to Stripe on web automatically.

### Compliance checklist before submitting the AAB

- [ ] Pricing screen on Android opens the Google Play sheet (not a Stripe URL)
- [ ] All six product IDs above exist and are **Active** in Play Console
- [ ] `verify-iap` returns `{ success: true }` for a real test purchase
- [ ] `/store` Smart Tag checkout still opens Stripe (intentional)
- [ ] Pre-launch report has no policy warnings about external payment links
