# CriderGPT iOS App Build Guide (No MacBook Required)

This guide explains how to build the CriderGPT iOS app using **Capacitor + EAS Cloud Build** so you never need a MacBook.

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. **An Apple Developer Account** ($99/year — sign up at [developer.apple.com](https://developer.apple.com))
4. **EAS CLI** (Expo Application Services — handles cloud builds on a remote Mac)
5. **Git** (to clone the repo)

---

## Phase 1: Project Setup (Windows/Linux/Mac)

### Step 1: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### Step 2: Install Capacitor iOS Platform

```bash
npm install @capacitor/ios
npx cap add ios
```

### Step 3: Install Required Capacitor Plugins

```bash
# Core plugins
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app

# NFC (Smart ID system)
npm install capacitor-nfc

# In-App Purchases (Apple IAP)
npm install @capacitor-community/in-app-purchases

# Sensors & Hardware
npm install @capacitor/haptics @capacitor/camera @capacitor/geolocation
npm install @capacitor/motion @capacitor/network @capacitor/filesystem
npm install @capacitor/device @capacitor/push-notifications
npm install @capacitor/bluetooth-le

# Google Sign-In (native popup)
npm install @codetrix-studio/capacitor-google-auth
```

### Step 4: Build & Sync

```bash
npm run build
npx cap sync ios
```

---

## Phase 2: Configure iOS Project

### Step 5: Update `capacitor.config.ts`

Your config should already have these settings:

```typescript
ios: {
  contentInset: 'automatic',
  preferredContentMode: 'mobile',
  scheme: 'CriderGPT',
}
```

### Step 6: Configure Info.plist Permissions

After `npx cap add ios`, edit `ios/App/App/Info.plist` and add:

```xml
<!-- NFC -->
<key>NFCReaderUsageDescription</key>
<string>CriderGPT needs NFC to scan Smart ID tags for livestock identification.</string>
<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
  <string>*</string>
</array>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>CriderGPT needs camera access for photo capture and scanning.</string>

<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>CriderGPT uses your location for weather data and sensor context.</string>

<!-- Bluetooth (Stripe card reader) -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>CriderGPT uses Bluetooth to connect to card readers for in-person payments.</string>

<!-- Motion/Accelerometer -->
<key>NSMotionUsageDescription</key>
<string>CriderGPT uses motion sensors for shake detection and device orientation.</string>

<!-- Push Notifications -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### Step 7: Configure Supabase Redirect URL

In your **Supabase Dashboard** → **Authentication** → **URL Configuration**:

Add this to **Redirect URLs**:
```
cridergpt://auth-callback
```

### Step 8: Add URL Scheme for OAuth

In `ios/App/App/Info.plist`, add:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>cridergpt</string>
    </array>
  </dict>
</array>
```

---

## Phase 3: Cloud Build with EAS (No Mac Needed!)

### Step 9: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Step 10: Initialize EAS

```bash
eas init
eas build:configure
```

Choose **iOS** when prompted.

### Step 11: Build in the Cloud

```bash
# Development build (for testing)
eas build -p ios --profile development

# Production build (for App Store)
eas build -p ios --profile production
```

**What happens:** Your code uploads to Expo's cloud servers, a remote Mac builds it, and you get an `.ipa` file download link.

---

## Phase 4: App Store Setup

### Step 12: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Name**: CriderGPT
   - **Bundle ID**: `app.cridergpt.android` (matches your Capacitor config)
   - **SKU**: `cridergpt-ios`
   - **Primary Language**: English

### Step 13: Configure In-App Purchases

In App Store Connect → Your App → **Monetization** → **In-App Purchases**:

Create these products:

| Product ID | Type | Price | Description |
|-----------|------|-------|-------------|
| `com.cridergpt.plus.monthly` | Auto-Renewable Subscription | $3/mo | CriderGPT Plus — 100 messages/day |
| `com.cridergpt.pro.monthly` | Auto-Renewable Subscription | $7/mo | CriderGPT Pro — 500 messages/day |
| `com.cridergpt.lifetime` | Non-Consumable | $30 | CriderGPT Lifetime — unlimited forever |
| `com.cridergpt.credits.100` | Consumable | $0.99 | 100 AI Credits |
| `com.cridergpt.credits.500` | Consumable | $3.99 | 500 AI Credits |
| `com.cridergpt.credits.1000` | Consumable | $6.99 | 1000 AI Credits |

### Step 14: Add Apple Shared Secret to Supabase

1. In App Store Connect → Your App → **App Information** → **App-Specific Shared Secret** → **Generate**
2. Copy the secret
3. In **Supabase Dashboard** → **Edge Function Secrets**, add:
   - `APPLE_SHARED_SECRET` = (your shared secret)
   - `APPLE_VERIFY_PRODUCTION` = `true` (set to `false` for sandbox testing)

---

## Phase 5: Submit & Launch

### Step 15: Submit the Build

```bash
# Upload to App Store Connect
eas submit -p ios

# OR upload the .ipa manually in App Store Connect → TestFlight
```

### Step 16: Fill App Store Listing

- **Screenshots**: 6.7" (iPhone 15 Pro Max) and 6.1" sizes
- **Description**: AI assistant for farmers, welders, and rural innovators
- **Privacy Policy URL**: `https://cridergpt.lovable.app/privacy`
- **Category**: Productivity
- **Age Rating**: 4+

### Step 17: Submit for Review

Click **Submit for Review** in App Store Connect. Apple typically reviews in 1-3 days.

---

## Updating the App

After making changes in Lovable:

```bash
# Pull latest from GitHub
git pull

# Rebuild and sync
npm install
npm run build
npx cap sync ios

# Build new version in cloud
eas build -p ios --profile production

# Submit update
eas submit -p ios
```

---

## Payment System — How It Works on iOS

**⚠️ IMPORTANT: Stripe is BLOCKED for digital purchases on iOS.**

| Product Type | Payment Method | Status |
|-------------|---------------|--------|
| Plus/Pro/Lifetime subscriptions | Apple In-App Purchase ONLY | ✅ Built & ready |
| Credit packs | Apple In-App Purchase ONLY | ✅ Built & ready |
| Physical products (Smart ID tags, merch) | Stripe allowed | ✅ Working |
| In-person POS sales | Stripe Terminal | ✅ Working |

The payment flow:
1. User taps upgrade on iOS → Native Apple IAP dialog appears
2. Apple processes payment
3. App calls `verify-iap` edge function with the receipt
4. Backend verifies with Apple servers
5. `ai_usage.user_plan` and `profiles.tier` are updated
6. User gets the same Plus/Pro/Lifetime features as web Stripe users

---

## Sensor & API Support on iOS

| Sensor/API | Capacitor Plugin | Smart ID? | Status |
|-----------|-----------------|-----------|--------|
| NFC (tag scanning) | `capacitor-nfc` | ✅ Yes | Ready June 6 |
| Camera | `@capacitor/camera` | Photo capture | Ready |
| GPS/Location | `@capacitor/geolocation` | Weather context | Ready |
| Accelerometer/Gyroscope | `@capacitor/motion` | Shake detection | Ready |
| Bluetooth LE | `@capacitor/bluetooth-le` | Card reader | Ready |
| Haptic feedback | `@capacitor/haptics` | Tap feedback | Ready |
| Push notifications | `@capacitor/push-notifications` | Alerts | Ready |
| Network status | `@capacitor/network` | Offline mode | Ready |
| Local filesystem | `@capacitor/filesystem` | Local storage | Ready |
| Device info | `@capacitor/device` | Platform detect | Ready |

---

## iOS-Specific Notes

- **NFC on iPhone**: Requires iOS 13+ and iPhone 7 or later. NFC scanning is available starting June 6, 2025.
- **No MacBook needed**: EAS Cloud Build handles all Xcode compilation remotely.
- **Same backend**: iOS uses the exact same Supabase backend, same database, same edge functions as web and Android.
- **Unified plans**: Plus, Pro, and Lifetime work identically whether purchased via Stripe (web), Apple IAP (iOS), or Google Play (Android).

---

## Debugging

### TestFlight Testing
1. After cloud build, upload to TestFlight via `eas submit`
2. Add testers in App Store Connect → TestFlight
3. Testers install via TestFlight app

### Common Issues

| Issue | Solution |
|-------|----------|
| EAS build fails | Check `eas build --platform ios --profile development --no-wait` for logs |
| NFC not working | Ensure NFC capability is added in Apple Developer portal |
| IAP products not loading | Products must be "Ready to Submit" status in App Store Connect |
| Push notifications fail | Upload APNs certificate to Supabase or configure FCM |
| OAuth redirect fails | Verify `cridergpt://auth-callback` is in Supabase redirect URLs |

---

## Version Info

- **CriderGPT Version**: 4.9.9
- **Capacitor Version**: 6.x
- **Target iOS**: 14.0+
- **Supported Devices**: iPhone 7 and later
- **NFC Support**: iPhone 7+ (iOS 13+)
- **Build Method**: EAS Cloud Build (no Mac required)
