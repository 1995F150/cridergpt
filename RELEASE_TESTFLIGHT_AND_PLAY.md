# TestFlight + Play Internal Testing — Stage 7 Release Guide

This guide walks you (Jessie) through getting the **native iOS** and **native Android** apps into testers' hands. It only covers what changes in Stage 7 (push, deep links, dark polish) plus the standard upload flow.

---

## 1 · iOS → TestFlight

### One-time Xcode setup
1. Open `ios_app/` in Xcode. Select target **CriderGPT**.
2. **Signing & Capabilities** — add or confirm:
   - **Push Notifications**
   - **Background Modes** → check *Remote notifications*
   - **Near Field Communication Tag Reading** (already required by Stage 3)
   - **Associated Domains** → add `applinks:cridergpt.com` (enables universal links — `https://cridergpt.com/tag/…` opens the app)
   - **In-App Purchase** (Stage 5)
3. **Info.plist** — confirm:
   - `GIDClientID` replaced with the real Google iOS client id
   - `NFCReaderUsageDescription` present
   - `UIBackgroundModes = [remote-notification]` (added in Stage 7)
   - `CFBundleURLTypes` includes both the reversed Google client id and the `cridergpt` scheme (added in Stage 7)
4. **Apple Push key (APNS)** — in App Store Connect → Keys → create an **APNs Auth Key** (.p8). Upload it to whatever you use to send pushes (your backend, OneSignal, FCM, etc).

### Universal Links file
Host this at `https://cridergpt.com/.well-known/apple-app-site-association` (no extension, served as `application/json`):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.app.cridergpt.ios",
        "paths": ["/tag/*", "/chat", "/livestock", "/events", "/profile"]
      }
    ]
  }
}
```
Replace `TEAMID` with your Apple developer team id.

### Archive + upload
1. Xcode → **Product → Scheme → Edit Scheme → Run → Build Configuration: Release**.
2. Connect a real device (TestFlight requires a Release archive — simulator builds aren't accepted).
3. **Product → Archive**.
4. In the Organizer window → **Distribute App → App Store Connect → Upload**. Sign with your distribution cert.
5. After processing finishes in App Store Connect (≈10 min), open the build → fill **Export Compliance** ("No" if you don't use custom crypto).
6. **TestFlight → Internal Testing** → add your Apple ID as an internal tester → install via the TestFlight app on iPhone.

### Sandbox IAP testing
1. App Store Connect → **Users and Access → Sandbox Testers** → create one.
2. On the iPhone: Settings → App Store → **Sandbox Account** → sign in as that tester.
3. Open the TestFlight build → Profile tab → Subscribe. You'll be charged $0 but the full StoreKit 2 flow runs and `verify-iap` records it.

### Verifying Stage 7
- **Push:** Profile → *Enable notifications* → grant permission. Watch Xcode console for `[Push] registered APNS token`. Confirm a row appears in `device_push_tokens` for your user.
- **Deep link (custom scheme):** Safari → `cridergpt://tag/CriderGPT-ABC123` → app opens on Smart ID and looks up that tag.
- **Universal link:** open `https://cridergpt.com/tag/CriderGPT-ABC123` in Messages → tapping it should open the app (only works once the `apple-app-site-association` file is live).

---

## 2 · Android → Play Internal Testing

### One-time Play Console setup
1. **Play Console → Create app** (skip if app already exists). Package: `app.cridergpt.android`.
2. **App content** wizard — fill privacy policy URL, data safety form, content rating. Internal testing won't ship without these.
3. **Setup → App signing** — let Google manage the signing key (Play App Signing). Note the **SHA-256 cert fingerprint** under *App integrity*.
4. **Firebase Console → cridergpt project** — confirm the Android app is registered with that SHA-256. Re-download `google-services.json` if you changed it and replace `android_app/app/google-services.json`.

### Android App Links file
Host this at `https://cridergpt.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.cridergpt.android",
    "sha256_cert_fingerprints": ["YOUR:PLAY:APP:SIGNING:SHA256:FINGERPRINT"]
  }
}]
```
The fingerprint comes from Play Console → *App integrity → App signing key certificate → SHA-256*. Until this file is live, `https://cridergpt.com/tag/…` will open in Chrome, not the app. The `cridergpt://` custom scheme works regardless.

### Build a signed AAB
The repo's self-hosted Android builder produces signed APK + AAB on every web update (see `mem://features/self-hosted-android-builder`). If you'd rather build locally:

```bash
cd android_app
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

If you build locally you must sign with the same upload key registered in Play Console. The CI builder already does this.

### Upload + test
1. Play Console → **Testing → Internal testing → Create new release**.
2. Upload `app-release.aab`.
3. Release notes: e.g. *"Stage 7: push notifications, deep links, dark theme polish."*
4. **Testers tab** → create an email list with your Gmail → save.
5. **Copy the opt-in URL** → open it on your Android phone → tap *Become a tester* → install from Play.

### Verifying Stage 7
- **Push:** sign in. Logcat: `FCMTokenService: FCM token registered with backend`. Verify a row in `device_push_tokens` with `platform = 'android'`.
- **Deep link (custom scheme):**
  ```bash
  adb shell am start -a android.intent.action.VIEW -d "cridergpt://tag/CriderGPT-ABC123"
  ```
  App opens on Smart ID with that tag.
- **App link (https):** once `assetlinks.json` is live and Play has verified it, tapping `https://cridergpt.com/tag/CriderGPT-ABC123` in any messenger opens the app directly. Check verification status:
  ```bash
  adb shell pm get-app-links app.cridergpt.android
  ```

---

## 3 · Backend prerequisites (one-time)

These are already deployed automatically when this stage shipped, but if you ever reset the project:

- Migration `device_push_tokens` table (RLS: user can read/write their own rows).
- Edge function `register-device-token` (verifies JWT, upserts the row).

The actual *send-a-push* worker (APNS / FCM HTTP v1) is **not** part of Stage 7. When you're ready, point your existing backend or a new edge function at the `device_push_tokens` table — every signed-in mobile install will have a row.

---

## 4 · Troubleshooting

| Symptom | Fix |
|---|---|
| iOS push button does nothing | Push Notifications capability missing in Xcode, or running on simulator (APNS requires a real device). |
| `[Push] failed to upload token: unauthorized` | User session expired — sign out & back in, then retap Enable notifications. |
| iOS universal link opens Safari instead of app | `apple-app-site-association` not reachable, wrong `TEAMID`, or `Associated Domains` capability not added. Delete app, reinstall, wait 60s. |
| Android `cridergpt://` link does nothing | App not installed, or another app stole the scheme. Confirm with `adb shell pm dump app.cridergpt.android | grep -A2 cridergpt`. |
| Android `https://cridergpt.com/...` opens Chrome | `assetlinks.json` not live or fingerprint mismatch. Re-run `pm get-app-links`. |
| FCM token never uploads on Android | `google-services.json` belongs to the wrong project, or no internet at sign-in. Force a refresh: clear app data → sign in again. |
| Play upload rejected: "AAB not signed" | You built locally without the upload keystore. Use the CI builder or upload from Android Studio with the correct keystore. |

---

Stage 7 done. Stage 8 candidates: server-side push sender, App Store + Play store listing assets (screenshots, copy, icons at all sizes), and crash reporting wiring.
