# CriderGPT iOS (Native SwiftUI)

Native iOS app, written in SwiftUI, targets iOS 16+. Talks to the **same Supabase backend** (`udpldrrpebdyuiqdtqnq`) and **same edge functions** as the website — no parallel backend, no mock data.

> Built in staged commits. This is **Stage 1**: scaffold + theme + Supabase client + auth gate + empty root shell. No feature tabs yet — they're added as each one is implemented (Chat, Smart ID, Livestock, Calendar, Profile/IAP). That way you never see a tab that does nothing.

## What's in here

```
ios_app/
  CriderGPT/
    App/
      CriderGPTApp.swift     // @main entry, AppDelegate hooks
      RootView.swift         // auth gate -> MainTabView (grows per stage)
      Theme.swift            // brand colors, fonts (matches src/index.css tokens)
    Supabase/
      SupabaseClient.swift   // shared singleton, reads anon key from Info.plist
      AuthService.swift      // sign-in/up, Apple, Google, session restore
      EdgeFunctions.swift    // typed wrappers (one per edge function, added per stage)
    Features/
      Auth/AuthView.swift    // sign-in / sign-up screen
    Models/
      Profile.swift
    Components/
      LoadingView.swift
      ErrorBanner.swift
  Package.swift              // SPM: supabase-swift, google-sign-in
  Info.plist                 // capabilities (NFC, camera, mic added later stages)
  .gitignore
```

## One-time setup (you, on a Mac)

1. Install Xcode 15+ (free, App Store).
2. Open this folder: `File → Open → ios_app/Package.swift`. Xcode will resolve packages.
3. Add an Xcode project wrapper (only needed for App Store builds, not for running in simulator from SPM):
   - `File → New → Project → iOS App`
   - Product name: **CriderGPT**, Bundle ID: **com.cridergpt.ios**, Interface: **SwiftUI**, Language: **Swift**, target iOS 16.
   - Drop the `CriderGPT/` folder into the new project's "CriderGPT" group, "Copy items if needed" UNCHECKED, "Create groups" selected.
   - In project settings → Signing & Capabilities → enable **Sign in with Apple**. Add other capabilities (Push Notifications, Associated Domains for `applinks:cridergpt.com`, Near Field Communication Tag Reading) in later stages when those features land.
4. Add Info.plist values from `ios_app/Info.plist` (or replace the generated one).

## Build & run (Simulator)

```bash
# from Xcode: ⌘R
```

For TestFlight you need an Apple Developer Program account ($99/yr).

## Secrets

The Supabase anon key (publishable) lives in `Info.plist` under `SUPABASE_ANON_KEY`. It's safe to commit — it's the same key already in the web project's `.env`. The Supabase URL is also in `Info.plist`.

`LOVABLE_API_KEY` and `STRIPE_SECRET_KEY` **never** go in the iOS app. Edge functions hold those server-side; the app just calls the function.

## Roadmap

| Stage | Adds                                                              | Tabs after stage |
|-------|-------------------------------------------------------------------|------------------|
| 1     | Scaffold, Auth, Theme, Supabase client                            | (no tabs yet)    |
| 2     | Chat (streaming from `chat` edge function)                        | Chat             |
| 3     | Smart ID (CoreNFC scan + TagLookup + manual fallback)             | Chat \| SmartID  |
| 4     | Livestock list/detail + Calendar/Events                           | + Livestock \| Calendar |
| 5     | Profile + StoreKit 2 IAP (`cridergpt_plus_monthly`, `cridergpt_pro_monthly`) + Calculators | + Profile |
| 6     | Android audit + targeted fixes to match iOS feature scope         | —                |
| 7     | Deep links, push, dark-theme polish, TestFlight checklist         | —                |

