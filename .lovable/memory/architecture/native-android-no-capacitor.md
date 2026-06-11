---
name: Native Android (no Capacitor)
description: CriderGPT Android app is fully native Kotlin/Compose. Capacitor is removed. IAP uses Google Play Billing only.
type: constraint
---
- The shipping Android app lives in `android_app/` (Kotlin + Compose) and is built by the self-hosted Ubuntu builder.
- **Do not** add `@capacitor/*` packages, `capacitor.config.ts` features, or `npx cap` instructions for Android. Capacitor is no longer used.
- The web build (Vite) is the PWA/web surface only.
- Mobile digital purchases use **Google Play Billing** (BillingClient) → `verify-iap` edge function.
- Active subscription product IDs in Play Console:
  - `cridergpt_plus_monthly` → plan `plus`
  - `cridergpt_pro_monthly`  → plan `pro`
- No yearly, lifetime, or consumable credit packs on Android right now.
