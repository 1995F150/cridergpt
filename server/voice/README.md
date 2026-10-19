# CriderGPT local call and owned-voice development

Status: architecture audit and private reference preparation, **not a deployed local speech or cloning service**. No root services, proxy routes, model registry, public API URL, keys or production speech functions were changed. No audio was sent to a provider in this investigation.

## What the current call actually does

The visible `CallModeInterface` imports `useDIYCallMode`. Its microphone/VAD recorder invokes three Supabase functions, sequentially:

1. `speech-to-text`: authenticated OpenAI `whisper-1` transcription of base64 browser audio.
2. `chat-with-ai`: CriderGPT model routing. Native IDs use the authenticated server proxy; other named models can resolve to configured external backends. Choosing native text does **not** make current STT/TTS local.
3. `text-to-speech`: authenticated OpenAI `tts-1`, stock voices, and usage quotas.

Two other hooks (`useCallMode`, `useRealtimeCall`) implement external realtime/WebRTC paths. No importing components for those hooks were found in this source tree; they are not the hook imported by this interface. Any migration must inventory remaining callers rather than removing them indiscriminately.

Confirmed defects in the inspected visible path:

- Hardcoded `cridergpt-4.1` ignored the chat selection.
- `conversationHistory` was sent; the Edge function destructures `conversation_history`. The current user turn was also included in history although native serialization appends it.
- Recording restarted before the asynchronous utterance pipeline completed, allowing overlapping turns and ordering errors.
- No session epoch checks let STT/chat/TTS replies arrive after hang-up or in a new call.
- The active audio was shifted out of the old queue, so hang-up only paused queued audio.
- STT/TTS empty/error responses could fail silently. Sentence splitting consumed one TTS usage unit per sentence.
- AudioContext/microphone cleanup during partial setup and late permission replies was incomplete; muted microphone tracks were not disabled.
- No utterance-duration bound, turn timeout or incomplete-response speech guard.

The draft client changes correct the above, capture the selected model at call start, isolate each recording's chunks, cap utterances at 20 seconds/2 MiB (VAD plus a recording deadline), handle device errors, serialize each complete turn including audio playback, preserve native model/incomplete metadata in captions, use one TTS request per answer, and display current external-speech status. The legacy admin-controlled Ubuntu branch of `chat-with-ai` sends only model/message to its configured `/chat`; it also needs a verified history-capable contract before call continuity can be promised on that branch. Native routing and the Engine payload use the canonical history field. Call history is in-memory and resets between calls; it is **not** yet persisted to conversation logs. The installed Supabase Functions client has no per-invoke AbortSignal option: timeout/hang-up invalidate downstream work but cannot cancel an already accepted upstream request. A server voice-session endpoint must implement actual job cancellation and usage accounting. No claim of server-side cancellation is made here.

The legacy `openai-realtime-token` handler previously continued when authentication was missing/invalid, could query private writing samples with a service-role client for ordinary callers, and logged caller identity. The source fix now requires verified authentication, limits private writing-sample context to the existing owner branch, and removes caller identity from the session log. This is covered by isolated handler tests and has not been deployed. The existing email-based owner classification should be migrated to an explicit server-managed role/owner ID before re-enabling this legacy path.

## Actual host evidence

- Xeon E3-1230 V2, eight logical CPUs, approximately 16 GiB RAM; AVX present, AVX2 absent.
- PCI device is RX 580 2048SP. Current text inference uses CPU. No compatible GPU speech acceleration has been demonstrated; do not assume CUDA/ROCm support.
- Approximately 13 GiB RAM available and 343 GiB disk free during inspection; these change with workload.
- `/opt/xtts/venv` exists but has no Torch, TTS, soundfile or faster-whisper installed. There is no running voice/XTTS/Whisper system service in the inspected list.
- `ffmpeg` is installed. `espeak` executable was not found.
- The repo has `src/assets/crider-voice-sample.mp3`: 42.624 seconds, 48 kHz stereo MP3. File existence/name does not establish speaker identity, rights, quality or consent. It was inspected for format only, not enrolled, uploaded, played or used for training.

## Server architecture to implement

Browser microphone/VAD → existing authenticated CriderGPT gateway → private session coordinator → local STT → existing selected-model text worker → local TTS/consented clone worker → streamed audio. Use the current hostname, server-side proxy authentication, per-user ownership and request correlation. Keep private workers on Unix sockets rather than publishing a second unauthenticated port.

A compatibility-oriented gateway contract can retain the existing hostname and credentials: authenticated `POST /v1/audio/transcriptions` for bounded recordings, `POST /v1/audio/speech` for binary generated audio, and an authenticated private voice-enrollment/consent API. A future WebSocket call session may carry monotonically numbered audio/control events. These are proposed routes, **not existing implemented endpoints**. Query capabilities before offering local speech; never expose a stock voice under a clone label. Worker replies must include actual model/revision and distinguish cancellation, silence, timeouts, limits and errors. Native text already has a selected-model proxy; reuse it instead of loading a text checkpoint in every voice process. Keep each worker's model warm and one active call initially.

The coordinator should own session UUIDs, monotonically increasing turn IDs, bounded queues, a cancellation token, recording-size/duration limits, and service deadlines. Interrupt/cancel must stop playback, clear pending speech chunks, cancel queued jobs and propagate cancellation into inference. Do not mix a reply from a previous turn/model/session. Never silently fall back to an external speech provider. Expose explicit local-unavailable errors and the actual STT/TTS model revision. Reuse the conversation persistence/authorization path; keep operational audio timing separate from private transcript content. Do not log raw audio/transcripts by default. Delete temporary audio on completion/cancellation, apply retention to enrolled references, and audit owner-scoped enroll/revoke/use operations.

Start half-duplex (record → process → play), then add partial STT, sentence-buffered TTS and echo-safe barge-in after correctness tests. Current browser autoplay and microphone permissions still require real iPhone/Android device testing; mocked audio tests do not prove those.

Proposed resource envelope: separate unprivileged worker, `CPUQuota=100%`, `MemoryMax=2G`, `MemorySwapMax=0`, concurrency 1, 30-second input, bounded text/audio output, private writable state, no device access and no network during warmed inference. These are **planning limits**, not verified sufficient for a clone model. Begin with an offline 5–10-second audio benchmark and measure peak RAM, STT WER, TTS real-time factor, time to first audio, silence hallucinations, intelligibility and speaker similarity before enabling calls. Simultaneous image/text/voice load must be tested. Do not increase worker limits at the expense of existing workloads without measuring.

## Model options and limits

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) is a local C/C++ STT option with CPU support. Build specifically for this host with AVX2/FMA/F16C disabled where unsupported, pin the commit/weight checksum, and benchmark a small English model. No binary/model has been installed here.
- [Piper](https://github.com/OHF-Voice/piper1-gpl) is a local TTS option. Current engine is GPL-3.0; each voice has its own model license. A stock Piper voice is **not** an instant clone. Custom-voice training needs transcribed recordings, compute and held-out quality checks; verify distribution obligations before integrating.
- [Chatterbox](https://github.com/resemble-ai/chatterbox) documents reference-conditioned voice synthesis and a small Nano CPU-oriented variant. Availability of a compatible pinned package, weights and their license must be verified separately; repository performance claims are not benchmarks on this Xeon. No weights downloaded or latency promised.
- [XTTS-v2](https://huggingface.co/coqui/XTTS-v2) supports reference voice cloning but weights use the Coqui Public Model License. Do not assume it can be shipped commercially just because source is available. No license acceptance or model download was performed.

We can build our own orchestration, enrollment, authorization and deployment around a suitably licensed pretrained speech model. That is distinct from pretraining a speech model from zero. Training a new foundation speech/cloning model from scratch is not a sensible next run on this server; a reference-conditioned local prototype is the practical first step. Exact memory/duration estimates require a pinned candidate and calibration, not a GPU name alone.

## Implemented private reference tool

`enrollment.py` is a functional local CLI, not a public endpoint. It validates mono PCM16 WAV (6–120 seconds, supported 16–48 kHz rates, maximum 12 MiB), rejects silence/excess clipping/truncation, fingerprints audio, records explicit self/authorized consent evidence, and stores a UUID-named copy plus SQLite metadata with mode 0600 in a 0700 private directory. Listings and revocation are owner-scoped. Revocation marks the record unusable before deleting the copied sample. Backups must apply the same deletion/retention policy. It checks basic signal quality, **not** whether the clip contains speech or the speaker is authentic.

No enrollment runs automatically. Use only your own voice or an explicitly authorized speaker, and document the scope of use. `--owner` is an operator-provided label for this offline utility; any future HTTP API must derive it from a verified session, never a request-supplied owner field. The consent record is an attestation, not biometric verification.

```bash
# Prepare a new private, clean WAV outside this source tree after recording consent.
python3 server/voice/enrollment.py --owner YOUR_LOCAL_USER enroll \
  --wav /private/reference.wav --label 'My voice' --consent self \
  --evidence 'I recorded this clip and authorize its use for my CriderGPT voice.'
python3 server/voice/enrollment.py --owner YOUR_LOCAL_USER list
python3 server/voice/enrollment.py --owner YOUR_LOCAL_USER revoke VOICE_UUID
python3 -m unittest discover -s server/voice -p 'test_*.py' -v
node tests/call-turn.mjs
node tests/call-hook.mjs
node tests/voice-auth.mjs
```

The existing 42-second MP3 must not be auto-converted or enrolled as proof of consent. No voice cloning, embedding extraction or training has run. Next milestone is a separately pinned, offline speech worker prototype, followed by measured local call integration and explicit review before replacing production speech.
