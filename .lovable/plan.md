# Native iOS + Android Parity Rebuild

Goal: native iOS (SwiftUI) and native Android both match the website 1:1 for the v1 feature scope you picked — Chat/AI, Smart ID/NFC, Livestock + Events/Calendar, Auth + Profile + Subscriptions. iOS ships first; Android gets fixed in parallel so it's not a rerun of the half-broken state it's in now.

## Ground rules (so we don't repeat the Android mess)

- **No placeholder screens.** If a screen isn't wired to a real Supabase call, it doesn't get a nav entry. Period.
- **One source of truth for nav:** the website's primary nav (derived from `src/App.tsx` routes you actually use) drives the mobile bottom-tab order. Both iOS and Android use the same 5 tabs in the same order.
- **One source of truth for backend:** every API call goes through Supabase (same project: `udpldrrpebdyuiqdtqnq`, same anon key, same edge functions). No mock data anywhere.
- **Theme parity:** dark CriderGPT brand, same accent color tokens as web (`src/index.css`).
- **Smart ID:** scan-only, plain-text `CriderGPT-XXXXXX` tag format (per existing project memory). Same edge functions the website calls.
- **No ad SDK on iOS in v1** — you said you haven't added the iOS AdMob ID yet. I'll leave the hook stubbed and disabled (no broken placeholder UI), gated behind a single feature flag so flipping it on later is one line.

## Mobile bottom-nav (1:1, both platforms)

Mirroring the existing Android tabs which already match the website's main mobile entry points:

```text
[ Chat ] [ Livestock ] [ Smart ID ] [ Calendar ] [ Profile ]
```

Calculators move into a section inside Profile/More (matches website where they live under devhub/utility pages, not the primary surface). Confirm or change after seeing the iOS scaffold.

## iOS app (new, SwiftUI)

New folder: `ios_app/` — Xcode project, SwiftUI, iOS 16+. Bundle id: `com.cridergpt.ios` (confirm before I scaffold).

### Structure
```text
ios_app/
  CriderGPT.xcodeproj
  CriderGPT/
    App/
      CriderGPTApp.swift          // entry, AppDelegate for push/IAP
      RootView.swift              // tab router, auth gate
      Theme.swift                 // brand colors, fonts (matches index.css tokens)
    Supabase/
      SupabaseClient.swift        // shared singleton, anon key from Info.plist
      Auth.swift                  // sign in/up, Apple/Google, session restore
      EdgeFunctions.swift         // typed wrappers for chat, fermentation-grader, etc.
    Features/
      Chat/         ChatView, ChatViewModel, MessageBubble, streaming via SSE
      Livestock/    LivestockListView, AnimalDetailView, AddAnimalView
      SmartID/      ScanView (CoreNFC), TagLookupView, RegisterTagView
      Calendar/     CalendarView, EventDetailView, AddEventView
      Profile/      ProfileView, SubscriptionView (StoreKit2), CalculatorsView
    Models/         Animal, Event, ChatMessage, Profile, Subscription
    Components/     LoadingView, ErrorBanner, BrandedHeader
  Resources/
    Assets.xcassets (app icon, brand colors)
    Info.plist (NFC, camera, mic, push capabilities)
```

### Auth
- Apple Sign-In (required by App Store for iOS apps that have other social login) + Google Sign-In via popup-style OAuth (per project memory: no full-page redirects).
- Session restored on launch via Supabase Swift SDK; tab bar only shows after auth.

### Smart ID
- `CoreNFC` `NFCNDEFReaderSession`, reads plain-text payload, validates `^CriderGPT-[A-Z0-9]{6}$`, calls same lookup edge function the website uses, navigates to TagLookupView.
- Per project memory: iOS NFC limits acknowledged → fallback manual entry input below the scan button.

### Chat
- Streaming from same `chat` edge function as the website (Lovable AI Gateway).
- Renders message parts (text now, room for tool calls later).

### Subscriptions
- StoreKit 2 only (Apple requires native IAP for digital goods).
- Product IDs: `cridergpt_plus_monthly`, `cridergpt_pro_monthly` (same as Android per project memory).
- Receipts verified server-side by existing `verify-iap` edge function.

### Push & Deep Links
- APNs via Supabase, same `push_subscriptions` table.
- Universal links: `cridergpt.com/tag/:tagId` and `/livestockID/:tagId` open TagLookupView.

## Android (audit + fix, no rewrite)

Existing `android_app/` already has the 5 tabs and Kotlin/Compose scaffolding. I will:

1. **Audit each tab fragment** in `android_app/app/src/main/java/com/cridergpt/android/ui/{chat,livestock,smartid,calculators,calendar,profile}` against the website behavior and the iOS scope above.
2. **Fix or remove**, for each screen:
   - missing Supabase wiring → wire to the same edge function the website calls
   - placeholder buttons that no-op → either implement or delete
   - mismatched titles/icons vs. website → align
   - broken navigation transitions
3. **Smart ID:** verify NFC reader uses plain-text `CriderGPT-XXXXXX` (no hardware lock — per `livestock-system-integrity` memory).
4. **IAP:** confirm Play Billing wired to `cridergpt_plus_monthly` / `cridergpt_pro_monthly` and `verify-iap`.
5. **No code is added to ship issues you don't want yet** (no in-app AdMob popups beyond what's already there; I won't enable AdMob on iOS at all in v1).

`android/` folder (the one externally managed per project memory) will NOT be touched.

## Delivery in staged commits

1. **iOS scaffold + Theme + SupabaseClient + Auth + RootView/tabs** (you can open in Xcode and sign in)
2. **iOS Chat (streaming)**
3. **iOS Smart ID (NFC scan + TagLookup + manual fallback)**
4. **iOS Livestock + Calendar/Events**
5. **iOS Profile + StoreKit 2 subscriptions + Calculators section**
6. **Android audit report + targeted fixes for each tab to match iOS feature scope**
7. **Final pass: dark-theme parity, deep links, push, polishing, README for TestFlight build**

After each stage I'll tell you exactly what to test before moving on, so we catch missing wiring early instead of discovering it 5 commits later.

## What I need from you before I start stage 1

1. **iOS bundle id** — `com.cridergpt.ios` OK, or different?
2. **Confirm tab order** — `Chat | Livestock | Smart ID | Calendar | Profile`, with Calculators under Profile?
3. **Apple Developer Program account** — confirm you have one ($99/yr) so TestFlight is actually reachable; otherwise stage 1 still works in the iOS simulator but you can't ship.
4. **Anything from the website you DON'T want in v1 mobile** (e.g. Idea Planner, Recipes, Breeds, Snapchat Lens, FarmBureau, DevHub) — my default is to leave all of those website-only and not put them in the mobile tabs.

Answer those 4 and I'll start stage 1.
