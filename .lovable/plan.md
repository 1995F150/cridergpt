

# Plan: Add OAuth Sign-In Buttons + Admin Android Build System

## Summary

Three deliverables:
1. **GitHub and X (Twitter) sign-in buttons** on the Auth page (providers already configured in Supabase backend)
2. **Spotify sign-in button** (also already configured)
3. **Admin-only Android Build Automation panel** — an admin tool that displays build commands, triggers builds, and documents the web-to-Android pipeline

---

## 1. New OAuth Sign-In Buttons

Create three new components following the same popup pattern used by `GoogleSignInButton` and `SnapchatSignInButton`:

| Component | File | OAuth Provider |
|-----------|------|----------------|
| `GitHubSignInButton` | `src/components/GitHubSignInButton.tsx` | `github` |
| `TwitterSignInButton` | `src/components/TwitterSignInButton.tsx` | `twitter` |
| `SpotifySignInButton` | `src/components/SpotifySignInButton.tsx` | `spotify` |

Each will:
- Call `supabase.auth.signInWithOAuth({ provider: '...' })` with `skipBrowserRedirect: true`
- Open a centered popup window (same as Google button pattern)
- Poll for popup close, then check session
- Show loading spinner while authenticating
- Use appropriate brand icon (GitHub octocat SVG, X logo, Spotify logo)

**Wire into Auth page** (`src/pages/Auth.tsx`):
- Import all three new buttons
- Add them below the existing Google and Snapchat buttons in the "Or continue with" section

---

## 2. Admin Android Build System Panel

**New file:** `src/components/admin/AndroidBuildSystem.tsx`

An admin-only panel (added as a new tab in `AdminPanel.tsx`) that provides:

- **Build Status Dashboard**: Shows last build date, current version, build status
- **One-Click Build Commands**: Copyable command sequences for the full Capacitor build pipeline:
  - `npm run build` → `npx cap sync android` → `npx cap run android`
  - APK generation: `cd android && ./gradlew assembleDebug`
  - Release build: `cd android && ./gradlew assembleRelease`
- **Build Log Viewer**: Fetches and displays build logs from a `build_logs` table
- **Trigger Build** button: Invokes a new `android-build` edge function that logs the build request and stores status
- **Version Manager**: Input field to set the next version code/name

**New edge function:** `supabase/functions/android-build/index.ts`
- Accepts build requests from admin
- Logs build commands and status to a `build_logs` table
- Returns build instructions and status
- Admin-only (validates role via auth header)

**New migration:** Create `build_logs` table:
```sql
CREATE TABLE public.build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid REFERENCES auth.users(id),
  build_type text DEFAULT 'debug', -- 'debug' or 'release'
  version_name text,
  version_code integer,
  status text DEFAULT 'requested',
  log_output text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
-- RLS: admin only via has_role
```

**Wire into AdminPanel.tsx:**
- New tab with `Smartphone` icon, label "Android Build"
- Renders `<AndroidBuildSystem />`

---

## Files Changed/Created

| File | Action |
|------|--------|
| `src/components/GitHubSignInButton.tsx` | **New** |
| `src/components/TwitterSignInButton.tsx` | **New** |
| `src/components/SpotifySignInButton.tsx` | **New** |
| `src/pages/Auth.tsx` | Add 3 new sign-in buttons |
| `src/components/admin/AndroidBuildSystem.tsx` | **New** admin panel |
| `src/components/panels/AdminPanel.tsx` | Add Android Build tab |
| `supabase/functions/android-build/index.ts` | **New** edge function |
| `supabase/config.toml` | Register `android-build` |
| New migration | Create `build_logs` table + RLS |

## Note on Spotify
Spotify OAuth works on web only (no native Capacitor support). The button will use the same popup flow. This is fine since you mentioned not worrying about it on mobile.

## Note on Play Store Billing
The Google Play billing integration (for in-app purchases) is a separate concern from authentication. This plan does not address Play Store billing — that would require the Google Play Billing Library integration in the Android native layer, which is a much larger task we can plan separately.

