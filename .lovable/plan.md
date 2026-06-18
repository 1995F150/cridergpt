# CriderGPT Mobile Rebuild — Phased Plan

**Scope rules locked in from your answers:**
- Only edit `src/pages/devhub/androidStarterFiles.ts` and `src/pages/devhub/iosStarterFiles.ts`. Do **not** touch `android_app/` (builder owns it).
- Android `versionCode = 274` (you said 273 was highest uploaded), `versionName = "2.7.4"`.
- Audit-first: I read the website source before rewriting any starter module. Existing working systems are preserved, not replaced with placeholders.
- Web client ID `248754417531-pe960srs7ve7eu9f4ttm4k73tu33t1mi…` and Android client ID `248754417531-gnnhko80mrsohcfigs67lgmus81g4o57…` are wired in Phase 1.

## Phase 1 — Foundation (auth + nav + version)
**Goal:** App launches, signs in, lands on a drawer that matches the website. No regressions to existing modules.

1. **Audit pass (read-only)**
   - `src/App.tsx` route table → canonical module list
   - `src/components/` sidebar/drawer → canonical nav order
   - `src/contexts/AuthContext.tsx`, `useAdmin`, `user_roles` → admin gate rules
   - `useSubscriptionStatus` + `get-entitlement` → plan source of truth
2. **Android starter (`androidStarterFiles.ts`)**
   - `build.gradle`: `versionCode 274`, `versionName "2.7.4"`, `compileSdk 35`, `targetSdk 35`.
   - `AndroidManifest.xml`: confirm no stray AD_ID permission (not used → stays removed); deep-link intent filter for `app.cridergpt.android://oauth/callback`.
   - `SupabaseClient.kt`: unchanged URL/anon key (matches web).
   - `AuthViewModel.kt`: Google Sign-In via Credential Manager using **Android client ID** above; fall back to Chrome Custom Tab OAuth (no SHA-1/Firebase) per existing memory.
   - `MainActivity.kt`: handle OAuth deep-link → `supabase.auth.exchangeCodeForSession`.
   - `NavigationDrawer` + `mobile_navigation.xml`: full website section order (MAIN → PRODUCTIVITY → CREATIVE → ACCOUNT → TOOLS → STORE → INFO → EXTERNAL → ADMIN), admin section hidden unless `has_role(uid,'admin')`.
3. **iOS starter (`iosStarterFiles.ts`)**
   - Mirror nav and auth. Google Sign-In uses **Web client ID** as `serverClientID`; deep-link via `ASWebAuthenticationSession`.
   - IAP via StoreKit2, Stripe disabled for digital goods (per policy memory).

**Deliverable:** updated two starter files + a short changelog. You rebuild via the Ubuntu builder.

## Phase 2 — Core modules parity
After Phase 1 is verified building, I wire the high-traffic modules to match the web behavior exactly:
- Chat (fix ANR, image upload, send, generation, attachments)
- Pattern system (button, save, sync, %, reset, delete, yellow suggestion chips driven by `user_patterns`)
- AGI toggle + model selector (persisted in `user_preferences`)
- Gallery (Supabase Storage `media_generations` bucket, refresh)
- Files (upload/download/delete against same bucket the web uses)
- Vision Memory read path

## Phase 3 — Account, payments, admin, polish
- Plan/Payment screens call `get-entitlement` (single source); Google Play Billing for `cridergpt_plus_monthly` / `cridergpt_pro_monthly` → `verify-iap`; Stripe link only for physical store.
- Admin Panel / Idea Planner / Dev Hub gated by `has_role` RPC; hidden in drawer otherwise.
- Play Console compliance: targetSdk 35 confirmed, data-safety AD_ID = false, versionCode auto-increment helper script note in starter README.
- Remaining bug sweep (sign-out clears session, state persistence, crash handlers).

## Technical notes
- No Capacitor, no WebView wrapper anywhere. Each screen is Compose (Android) / SwiftUI (iOS) calling the same Supabase tables/edge functions the web uses.
- All new tables? **None** — web schema is the source of truth.
- Edge functions touched? **None new** in Phase 1; Phase 3 may add a `bump-android-version` helper only if you want it.

## Approval checkpoints
- ✅ after Phase 1 → you build APK, confirm sign-in + drawer.
- ✅ after Phase 2 → you confirm chat/gallery/pattern parity.
- ✅ after Phase 3 → ship to internal track.

Reply "go phase 1" to start.
Phase 2 additions to plan

## Phase 2 — Shipped
- Android: ChatScreen now has AGI toggle, model selector (cridergpt-fast/pro, gpt-4o-mini/4o), and yellow pattern suggestion chips from `user_patterns`. Prefs persist to `user_preferences`. Payload to `chat-with-ai` now includes `model` and `agi_mode`.
- Android: GalleryScreen reads `media_generations` (grid + refresh). VisionMemoryScreen reads `vision_memory`. Both wired into AppNav, removed from placeholder list.
- iOS: ChatView mirrors AGI toggle, model menu, pattern chips, prefs persistence. ChatViewModel sends `model` + `agi_mode` to `chat-with-ai`.
- iOS: GalleryView (`media_generations`) and VisionMemoryView (`vision_memory`) added.
- Remaining for Phase 3: Files/Projects native screens, Plan/Payment via `get-entitlement`, Play Billing `verify-iap` wiring, Admin Panel polish, Play Console compliance check.

## Phase 3 — Shipped
- Android: added `FilesScreen` (`user_reference_library`), `ProjectsScreen` (`projects`), `PlanScreen` (`user_subscriptions`), and `PaymentScreen` with Google Play Billing 7.0 wired to `cridergpt_plus_monthly` / `cridergpt_pro_monthly`. Purchases POST to the `verify-iap` edge function via new `SupabaseClient.invokeFunction` helper. Added `com.android.vending.BILLING` permission and `billing-ktx` dep. Routes wired in `AppNav`; entries removed from the placeholder list.
- iOS: added `FilesView`, `ProjectsView`, `PlanView`. `PlanView` reads `user_subscriptions` and links into existing `SubscriptionView` (StoreKit 2 → `verify-iap`). New views surface in `ProfileView` under Subscription and Modules sections.
- Play Console compliance: `targetSdk 35`, `versionCode 274`, no AD_ID permission, billing permission added; admin destinations remain hidden from non-admins (drawer + composable gates).
