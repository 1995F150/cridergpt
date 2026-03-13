

# Build a Self-Hosted Voice Cloning System for CriderGPT

## What You're Asking For

You want CriderGPT to have its own voice cloning engine — no ElevenLabs, no external API calls. A system that takes your voice sample (`src/assets/crider-voice-sample.mp3`) and can generate speech that sounds like you. Plus, you're thinking about a music feature down the road.

## The Reality Check

Building a true voice cloning system requires a **GPU-powered inference server** running a model like Coqui TTS, XTTS-v2, or OpenVoice. This cannot run inside a Supabase Edge Function or in the browser — it needs a dedicated server with GPU access.

Your current setup already has the right architecture: the `text-to-speech` edge function calls `http://localhost:5000/tts` — a local TTS engine endpoint. The problem is that endpoint doesn't exist yet (or isn't running).

## Architecture

```text
User types text / AI generates response
         │
         ▼
┌─────────────────────┐
│  text-to-speech     │  (existing edge function)
│  Edge Function      │
└────────┬────────────┘
         │ HTTP POST
         ▼
┌─────────────────────┐
│  Voice Engine       │  (NEW - self-hosted Python server)
│  XTTS-v2 / Coqui    │
│  localhost:5000/tts  │
│                     │
│  Voice Sample:      │
│  crider-voice-sample│
│  .mp3               │
└─────────────────────┘
         │
         ▼
   Audio response (cloned voice)
```

## Implementation Plan

### 1. Voice Engine Server (Python — runs on your own machine/VPS)

Create a Flask/FastAPI server that:
- Loads XTTS-v2 (open-source voice cloning model from Coqui)
- Accepts POST requests at `/tts` with `{ text, voice_sample }`
- Uses your `crider-voice-sample.mp3` as the reference voice
- Returns generated audio as MP3/WAV bytes
- Runs on port 5000 (matches your existing edge function)

This is a Python server you'd host on a VPS with a GPU (like a $7/mo GPU instance on Vast.ai, RunPod, or your own machine).

### 2. Voice Studio UI Panel

Create a new `VoiceStudioPanel` in the app with:
- **Voice Cloning Tab**: Upload voice samples, preview cloned output, manage voice profiles
- **TTS Tab**: Enhanced version of existing TextToSpeech with voice selection
- **Voice Library**: Save and manage multiple cloned voices
- **Music Tab** (placeholder for your music feature idea): Future music generation using your cloned voice

### 3. Update Edge Function

Modify `text-to-speech/index.ts` to:
- Point to your deployed voice engine URL (configurable via env var `VOICE_ENGINE_URL` instead of hardcoded `localhost:5000`)
- Support voice profile selection (different cloned voices)
- Support longer audio generation for music features later

### 4. Voice Profiles Table

New Supabase table `voice_profiles` to store:
- User's uploaded voice samples (stored in Supabase Storage)
- Voice model metadata (name, description, sample duration)
- Training status tracking

### 5. Integrate with Call Mode

Update `useCallMode.ts` to use the cloned voice instead of browser `SpeechSynthesis` — so when you're on a call with CriderGPT, it responds in YOUR cloned voice.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/panels/VoiceStudioPanel.tsx` | New | Main voice studio UI with tabs |
| `src/components/voice/VoiceCloner.tsx` | New | Upload samples, test cloning, manage profiles |
| `src/components/voice/VoiceLibrary.tsx` | New | Browse and select saved voice profiles |
| `src/components/voice/MusicStudio.tsx` | New | Placeholder for future music generation |
| `supabase/functions/text-to-speech/index.ts` | Edit | Use configurable engine URL, add voice profile support |
| `src/hooks/useCallMode.ts` | Edit | Use cloned voice for call mode responses |
| `src/components/TextToSpeech.tsx` | Edit | Add voice profile selector |
| DB migration | New | `voice_profiles` table + storage bucket |

## What You Need to Do (Outside Lovable)

1. **Set up a GPU server** — RunPod, Vast.ai, or your own PC with a decent GPU
2. **Deploy the Python voice engine** — I'll provide the exact code/Dockerfile
3. **Add `VOICE_ENGINE_URL` secret** to Supabase Edge Functions pointing to your server
4. **Upload voice samples** through the new Voice Studio UI

## What Stays the Same

- Existing TTS functionality works as fallback
- AGI mode integration stays
- Call mode keeps working (but upgrades to cloned voice when available)

