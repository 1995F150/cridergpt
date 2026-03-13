

# Full Self-Hosted Music Studio for CriderGPT

## What We're Building

A complete music generation system — fully self-hosted, no external APIs — that lets you:
1. **AI-generated songs** — describe a song, AI creates lyrics + melody sung in your cloned voice
2. **Covers in your voice** — upload any song, re-sing it with your voice model
3. **Instrumentals + beats** — generate backing tracks, beats, ambient music
4. **Voice-to-song** — hum/sing a melody, AI polishes it into a full track

## Architecture

```text
User (Music Studio UI)
    │
    ▼
┌─────────────────────┐
│  generate-music     │  (new edge function)
│  Edge Function      │
└────────┬────────────┘
         │ HTTP POST
         ▼
┌─────────────────────────────────────────────┐
│  Voice Engine Server (your GPU box)         │
│                                             │
│  /tts          — existing voice cloning     │
│  /music/generate — NEW: AI song generation  │
│  /music/cover    — NEW: voice-swap covers   │
│  /music/hum      — NEW: hum-to-song        │
│  /music/beat     — NEW: instrumental gen    │
│                                             │
│  Models: XTTS-v2 (voice) + MusicGen (music) │
│          + Demucs (stem separation)          │
└─────────────────────────────────────────────┘
```

## Implementation

### 1. Expand Python Voice Engine (`public/voice-engine/server.py`)

Add new routes using Meta's **MusicGen** (open-source music generation) and **Demucs** (stem separation for covers):

- `POST /music/generate` — text prompt → instrumental track via MusicGen
- `POST /music/cover` — upload song + voice profile → Demucs splits stems → XTTS-v2 re-sings vocals → remix
- `POST /music/hum` — upload humming audio → MusicGen extends/polishes it
- `POST /music/beat` — genre/BPM/mood → instrumental beat generation

### 2. New Edge Function: `generate-music`

Routes music requests from the app to your self-hosted engine. Handles auth, usage tracking, and the `VOICE_ENGINE_URL` connection.

### 3. Replace MusicStudio.tsx Placeholder

Transform the "Coming Soon" placeholder into a fully functional UI with:
- **Generate tab** — text prompt, genre/mood selectors, duration slider, generate button
- **Cover tab** — upload a song file, select voice profile, process
- **Hum-to-Song tab** — record/upload humming, AI polishes it
- **Beat Maker tab** — genre, BPM, mood dropdowns → generate instrumental
- **My Tracks** — list of generated tracks with playback, download, delete

### 4. Database: `music_tracks` Table

Store generated music metadata:
- `id`, `user_id`, `title`, `type` (generate/cover/hum/beat), `prompt`, `audio_url`, `duration_seconds`, `status`, `created_at`

### 5. Update `requirements.txt` + Dockerfile

Add `audiocraft` (MusicGen), `demucs` dependencies to the voice engine server.

## Files

| File | Action | What |
|------|--------|------|
| `public/voice-engine/server.py` | Edit | Add /music/* routes with MusicGen + Demucs |
| `public/voice-engine/requirements.txt` | Edit | Add audiocraft, demucs |
| `public/voice-engine/Dockerfile` | Edit | Include new deps |
| `supabase/functions/generate-music/index.ts` | New | Edge function proxying to voice engine |
| `src/components/voice/MusicStudio.tsx` | Rewrite | Full music generation UI |
| `supabase/config.toml` | Edit | Add generate-music function |
| DB migration | New | `music_tracks` table |

## What You'll Need (Outside Lovable)

- Redeploy the voice engine server with the new dependencies (MusicGen needs ~16GB VRAM for the medium model, or use the small model with ~8GB)
- Same `VOICE_ENGINE_URL` env var — no new secrets needed

