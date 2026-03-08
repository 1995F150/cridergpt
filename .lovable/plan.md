

# TikTok Integration for CriderGPT — Video Posting

## Overview
Integrate TikTok's Content Posting API so CriderGPT can publish videos directly to TikTok from the Media Studio.

## What's Needed

### 1. Store TikTok Credentials as Supabase Secrets
- `TIKTOK_CLIENT_KEY`: `awxha3nqo09v6vq2` (from your screenshot)
- `TIKTOK_CLIENT_SECRET`: You'll need to reveal and provide the client secret from the TikTok Developer Portal

### 2. Create `tiktok-auth` Edge Function
- Handle OAuth 2.0 authorization flow (TikTok uses Authorization Code flow)
- Endpoints: `get_auth_url` → redirects user to TikTok login, `exchange_code` → exchanges code for access token
- Store the user's TikTok access/refresh tokens in a `tiktok_tokens` table

### 3. Create `tiktok-post-video` Edge Function
- Uses TikTok's Content Posting API (`https://open.tiktokapis.com/v2/post/publish/video/init/`)
- Accepts a video URL (from the existing video export in Media Studio) and uploads it to TikTok
- Handles the two-step flow: initialize upload → upload video file → publish

### 4. Database: `tiktok_tokens` Table
- Columns: `id`, `user_id` (references auth.users), `access_token`, `refresh_token`, `expires_at`, `tiktok_user_id`
- RLS: users can only read/update their own tokens

### 5. UI Changes
- **VideoGenerator.tsx**: Add a "Post to TikTok" button next to the existing "Export as Video" button
- **Connect TikTok Account**: Add a TikTok connect button in Profile settings that initiates OAuth
- Add caption/description input for the TikTok post

### 6. Config Updates
- Register both new edge functions in `supabase/config.toml` with `verify_jwt = false`

## Prerequisites Before Implementation
- You need to provide the **TikTok Client Secret** (click the reveal icon in the Developer Portal)
- Your TikTok app needs the `video.publish` scope approved — check under "Scopes" in the portal
- Add `https://cridergpt.lovable.app/auth` as a redirect URI in TikTok's app settings

## Technical Flow
```text
User clicks "Post to TikTok"
  → Check if TikTok account is connected (has valid token)
  → If not: OAuth popup → tiktok-auth → store tokens
  → If yes: tiktok-post-video edge function
    → Initialize upload with TikTok API
    → Upload video binary
    → Return publish status to UI
```

