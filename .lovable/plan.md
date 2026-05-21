## Goal
Replace dependency on OpenAI Realtime API in Call Mode with our own self-built voice pipeline using existing TTS + chat infrastructure, so Call Mode is fully under our control (cheaper, more reliable, and themable with your own voice).

## Approach: DIY Call Mode Pipeline

Instead of one expensive WebRTC connection to OpenAI Realtime, chain three pieces we already partly own:

```text
Mic → STT (Whisper) → chat-with-ai (LLM) → TTS (OpenAI or self-hosted XTTS) → Speaker
                                          ↑
                                    streamed playback
```

Loop continuously while call is active, with VAD (voice activity detection) to know when user stops talking.

## What we already have
- `supabase/functions/text-to-speech` — OpenAI TTS, working, usage-tracked
- `supabase/functions/chat-with-ai` — LLM responses
- `public/voice-engine/server.py` — self-hosted XTTS-v2 + Whisper on your AMD box (CPU)
- `useCallMode.ts` / `useRealtimeCall.ts` — existing call UI we can repoint

## New pieces to build

1. **`supabase/functions/speech-to-text`** (new)
   - Accepts base64 audio chunk
   - Calls OpenAI Whisper API (`whisper-1`) — fallback to self-hosted Whisper on home server if reachable
   - Returns transcript

2. **`src/hooks/useDIYCallMode.ts`** (new, replaces realtime hook)
   - `getUserMedia` → MediaRecorder
   - Client-side VAD (simple RMS threshold, or `@ricky0123/vad-web` if approved later — start with RMS)
   - On silence detected → send chunk to `speech-to-text`
   - Send transcript to `chat-with-ai`
   - Stream response text to `text-to-speech` (sentence-by-sentence for low latency)
   - Play returned MP3 chunks sequentially via `Audio` queue
   - While AI speaks → mute mic input (already a pattern in current UI)

3. **`CallModeInterface.tsx`** — swap `useRealtimeCall` → `useDIYCallMode`. Keep all existing UI (rings, captions, mute, volume).

4. **Voice selection** — add a dropdown for OpenAI TTS voices (alloy/onyx/nova/…) or "My Cloned Voice" (XTTS from Voice Studio) so you can pick the call voice.

## Latency strategy
- Stream LLM tokens; flush to TTS at sentence boundaries (`. ! ?`)
- Start playing first audio chunk while next sentence is still generating
- Target: ~1.5–2.5s first-word latency (vs Realtime's ~600ms, but at ~10× lower cost)

## Out of scope for this round
- Interruption mid-AI-speech (barge-in) — can add later with VAD that keeps listening
- Self-hosted Whisper wiring — stub the home-server fallback, default to OpenAI Whisper

## Technical details
- Edge function: `speech-to-text` uses `multipart/form-data` POST to `https://api.openai.com/v1/audio/transcriptions`, model `whisper-1`
- VAD: rolling RMS over 30ms frames, end-of-utterance after 800ms of silence below threshold
- Audio queue: simple `HTMLAudioElement[]` with `onended` → play next
- Reuse existing `ai_usage` row for tracking STT requests (add `stt_requests` column via migration)

## Files touched
- NEW `supabase/functions/speech-to-text/index.ts`
- NEW `src/hooks/useDIYCallMode.ts`
- EDIT `src/components/CallModeInterface.tsx` (swap hook + add voice picker)
- MIGRATION add `stt_requests int default 0` to `ai_usage`

## Questions before I build
1. Default TTS voice for calls — `onyx` (current default), or do you want **your cloned voice** from Voice Studio as default when one exists?
2. Keep OpenAI Realtime as a fallback toggle ("Premium call mode"), or rip it out entirely?
