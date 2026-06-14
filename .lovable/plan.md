## Goal

Upgrade `/devhub/android-starter` from a 2-screen demo into a **full website-parity scaffold** so when you open it in Android Studio and press Run, you already have every nav tab, persistent login, and every screen wired to the correct Supabase table or edge function. No payment code (per your earlier note).

Source of truth = the website. Every screen reads/writes the **same tables and edge functions** the website uses, so they stay in sync automatically.

## What the generated app will contain

### Shell
- `MainActivity` hosts a Compose `NavHost` with a **bottom nav bar** matching the website:
  Chat · Livestock · Idea Planner · Calendar · Profile
- Top app bar with overflow menu → DevHub, Admin Panel, Account, Sign Out
- `DrawerSheet` exposes secondary links (Smart ID Store, Tag Lookup, Snapchat Lens, FarmBureau, TikTok Studio, etc.) — these tagged `external = true` launch `Intent.ACTION_VIEW` to **leave the app into Chrome** (your preference).

### Persistent session (never sign out on app close)
- Use **EncryptedSharedPreferences** (AndroidX Security) to store `access_token` + `refresh_token`.
- On launch: if refresh token exists, call `POST /auth/v1/token?grant_type=refresh_token` to get a fresh access token. Schedule background refresh 5 min before expiry via `WorkManager`.
- Only `SupabaseClient.signOut()` (tap Sign Out in menu) wipes the prefs. Force-close, reboot, low-memory kill → still signed in.

### Auth screen
- Email/password + “Continue with Google” (deep link `app.cridergpt.android://auth-callback` via Chrome Custom Tabs, no SHA-1 needed — matches your existing OAuth setup).

### Pre-wired feature screens (all read/write the live tables)

| Screen | Backend wiring |
|---|---|
| ChatScreen | `chat-with-ai` edge fn · saves to `chat_conversations` / `chat_messages` |
| LivestockListScreen | `livestock_animals` SELECT + `livestock_scan_logs` |
| ScanTagScreen | NFC reader → parses `CriderGPT-XXXXXX` → looks up `livestock_animals` |
| IdeaPlannerScreen | `idea_planner_ideas` CRUD with RLS-respecting filters |
| CalendarScreen | `events` SELECT/INSERT, two-tier visibility |
| ProfileScreen | `profiles` row for `auth.uid()`, edit display name/avatar |
| AccountManagementScreen | subscription tier from `user_subscriptions`, delete-account flow |
| DevHubScreen | Gated by `has_role(uid, 'owner')` RPC. Lists every DevHub module as links (opens website ones in Chrome, native-implemented ones in-app). |
| AdminPanelScreen | Gated by `has_role(uid, 'admin')`. Reads `admin_audit_logs`, `system_status`, `user_violations`. |
| NotificationsScreen | `user_notifications` realtime channel |

External-only items (Store, Snapchat Lens, FarmBureau lead form, TikTok Studio, Custom Filters, Recipes, Guides, Public Profile, Invite, Leaderboard) appear in the drawer and **launch the system browser** — that way they always look exactly like the website.

### Backend client (single file)
`SupabaseClient.kt` exposes:
- `signIn / signUp / signInWithGoogle / signOut`
- `refreshIfNeeded()` (called on launch + every resume)
- `from(table).select/insert/update/delete` mini-builder
- `invoke(fnName, payload)` for edge functions
- `realtime(table, filter, onChange)` via WebSocket

### Role gating
- `useHasRole(role)` Compose helper calls the existing `has_role(uid, role)` RPC.
- DevHub + Admin tabs render only if role check passes — same rule the website uses.

## File layout in the ZIP

```text
cridergpt-android-starter/
├── README.md
├── settings.gradle.kts · build.gradle.kts · gradle.properties · wrapper
├── app/build.gradle.kts            (+ AndroidX Security, WorkManager, Coil, Navigation-Compose)
└── app/src/main/
    ├── AndroidManifest.xml         (NFC, INTERNET, POST_NOTIFICATIONS, deep link)
    ├── res/                        (themes, strings, launcher icon stub)
    └── java/app/cridergpt/android/
        ├── MainActivity.kt
        ├── data/
        │   ├── SupabaseClient.kt           (REST + realtime + secure prefs)
        │   ├── SessionManager.kt           (EncryptedSharedPreferences + refresh)
        │   └── repositories/                (Livestock, Ideas, Events, Chat, Profile, Notifications)
        ├── ui/
        │   ├── theme/Theme.kt
        │   ├── nav/AppNav.kt                (NavHost + bottom bar + drawer)
        │   ├── nav/ExternalLinks.kt         (table of external URLs → Intent)
        │   ├── auth/{SignInScreen,GoogleSignInButton}.kt
        │   ├── chat/ChatScreen.kt
        │   ├── livestock/{LivestockListScreen,ScanTagScreen,AnimalDetailScreen}.kt
        │   ├── ideas/IdeaPlannerScreen.kt
        │   ├── calendar/CalendarScreen.kt
        │   ├── profile/{ProfileScreen,AccountManagementScreen}.kt
        │   ├── notifications/NotificationsScreen.kt
        │   ├── devhub/DevHubScreen.kt
        │   └── admin/AdminPanelScreen.kt
        └── util/{NfcReader.kt, ExternalBrowser.kt, RoleGate.kt}
```

## Web side (the only thing I change in the actual project)

1. Bump `src/pages/devhub/androidStarterFiles.ts` with the new file set above.
2. Tweak `AndroidStarterExport.tsx` so the “What’s inside” card lists the new screens, marks the source-of-truth rule, and notes “Persistent session — never signs out until you tap Sign Out.”
3. No changes to any other website file. No changes under `android_app/` (protected per project memory).

## What you still do manually

- Unzip → File → Open in Android Studio → Sync → Run ▶.
- Generate a release keystore once when you’re ready to ship.
- Add Google Play Billing later (intentionally left out).

## Out of scope (by your request)

- Payment, paywall, Play Billing
- APK signing / build automation (your Ubuntu builder already handles that)
- Touching `android_app/` (the externally managed folder)
