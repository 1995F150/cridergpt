

## Snapchat OAuth "Failed to load authorization data" Fix

### What's happening
The screenshot shows Snapchat's own error page: **"Authorization Error - Failed to load authorization data"**. This error comes from Snapchat's servers before any code on your side runs. It means Snapchat rejected the OAuth request before even showing a login screen.

### Root causes (in order of likelihood)

1. **Redirect URI mismatch**: The redirect URI sent in the request (`https://cridergpt.lovable.app/auth`) must be registered **exactly** in the Snapchat Developer Portal (Snap Kit dashboard). Even a trailing slash difference will cause this error.

2. **Snapchat App not in "Live" mode**: If the Snap Kit app is still in Development/Staging mode, only whitelisted test accounts can authorize. All other users see this error.

3. **Invalid or expired Client ID**: The `SNAPCHAT_CLIENT_ID` secret may be stale or from a deleted/disabled Snap Kit app.

### Plan

#### Step 1: Snapchat Developer Portal configuration (manual - you need to do this)
You need to verify these settings at [kit.snapchat.com](https://kit.snapchat.com):
- **Redirect URIs**: Add exactly `https://cridergpt.lovable.app/auth` (no trailing slash)
- **App Status**: Set to **Live** (not Development)
- **Login Kit**: Ensure Login Kit is enabled with the scopes: `user.display_name`, `user.bitmoji.avatar`, `user.external_id`
- **Confidential OAuth Client**: Confirm your app type matches (Web application)

#### Step 2: Code hardening (I will implement)
- Update the `SnapchatSignInButton` to show a user-friendly error message instead of a blank popup if Snapchat returns an error page
- Add the published URL as the redirect URI (currently uses `window.location.origin` which would differ on preview vs published)
- Add error logging to the edge function to capture the exact URL being generated for debugging

#### Step 3: Redeploy edge function
- Redeploy `snapchat-auth` after any code changes

### Technical details
- File: `src/components/SnapchatSignInButton.tsx` - hardcode published redirect URI for production
- File: `supabase/functions/snapchat-auth/index.ts` - add request URL logging
- The scopes format in the current code uses full URLs (`https://auth.snapchat.com/oauth2/api/user.display_name`) which is correct for Snap Kit v2

### What you need to check right now
Go to [kit.snapchat.com](https://kit.snapchat.com) and confirm:
1. Your app exists and is **Live**
2. `https://cridergpt.lovable.app/auth` is listed as a Redirect URI
3. Login Kit is toggled ON

Once you confirm the portal settings, I'll implement the code fixes.

