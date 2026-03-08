

# Plan: Fix Ads for Paid Users, Fix Tag Scanning, Remove Search Bar

## Three Issues to Fix

### 1. Hide Ads for Plus/Pro/Lifetime Users
The `AdsterraBanner` component currently shows to all users regardless of plan. It needs to check the user's subscription status and hide for paid plans.

**Changes:**
- Modify `src/components/AdsterraBanner.tsx` to use `useSubscriptionStatus()` hook
- If the user's plan is `plus`, `pro`, or `lifetime`, don't render the ad banner

### 2. Fix Tag Scanning ("Failed to scan tag")
The `scanCard` function in `useLivestock.ts` calls the `scan-card` edge function using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. However, the Supabase client in this project uses **hardcoded** values (not env vars). These env vars are likely undefined at runtime, causing the fetch to fail silently or hit the wrong URL.

**Fix:**
- Import the hardcoded URL and key from `@/integrations/supabase/client` (or re-export them), or use `supabase.functions.invoke()` instead of raw `fetch`
- Using `supabase.functions.invoke('scan-card', { body: { tag_id: tagId } })` is the cleanest fix — it automatically handles the URL, auth headers, and apikey

### 3. Remove Search Bar from Herd Tab
The user wants scan-only workflow. The search bar in the Herd tab (lines 126-136 of `LivestockPanel.tsx`) should be removed entirely. Animals are found by scanning, not searching.

**Changes:**
- Remove the search `Input` and `Search` icon import from `LivestockPanel.tsx`
- Remove the `search` state variable and filtering logic related to text search
- Keep the species filter buttons (those are useful for browsing the herd view)

## Technical Details

**Ad hiding** uses the existing `useSubscriptionStatus` hook which returns `{ plan, isActive }`. The component will short-circuit render to `null` when `isActive` is true.

**Tag scanning fix** replaces the raw `fetch()` call with `supabase.functions.invoke()` which is the Supabase SDK's built-in method for calling edge functions. This automatically uses the correct project URL and attaches the user's session token — eliminating the env var dependency entirely.

**Search removal** is a straightforward UI deletion from `LivestockPanel.tsx`.

