# CriderGPT local call and owned-voice development

Status: **private local speech and reference-conversion service installed and running** as `cridergpt-voice.service`. The public chat/call routes have not been switched over. Existing chat/native/image/vision services, public URLs, production keys and speech functions remain unchanged. No human recording was used or sent to a provider. The initial audit below is retained; current operation and access instructions follow it.

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
- `/opt/xtts/venv` exists but has no Torch, TTS, soundfile or faster-whisper installed. At the initial audit there was no running voice/XTTS/Whisper service. The new user service now runs under `~/cridergpt-voice`, independently of that empty XTTS environment.
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

The existing 42-second MP3 was not converted or enrolled as proof of consent. The later pipeline test used a locally generated speech fixture only; it did not clone a human speaker. No voice-model weight training has run. Public call integration and real voice-quality acceptance remain separate release steps.

## Running server system — current delivery

Installed root: `/home/cridergpt2026/cridergpt-voice` (approximately **2.1 GiB**). The private Python environment has its own snapshot of the existing ML/server packages and independently installed pinned add-ons. No production Python package was changed; imports were verified to resolve into this private runtime. `runtime-host.json` records the frozen base package versions; its name refers to the originally inspected base, not a continuing dependency on the host environment. Model and source pins are in `model-manifest.json`; downloaded models and the full runtime are outside Git.

Active models:

- Local transcription: `openai/whisper-tiny.en`, revision `87c7102498dcde7456f24cfd30239ca606ed9063`, Apache-2.0, English only.
- Standard local speech: Piper `en_US-ljspeech-medium`, voice repository revision `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. Its model card identifies LJ Speech data as public domain; the Piper engine is GPL-3.0. Third-party licenses remain applicable; no existing CriderGPT code was relicensed.
- Reference conversion: OpenVoice V2 weights revision `f36e7edfe1684461a8343844af60babc2efbb727`, source `74a1d147b17a8c3092dd5430504bd83ef6c7eb23`, MIT. The worker uses the pinned model's speaker encoder and voice-conversion operations directly with current complex-valued Torch STFT and safe `weights_only=True` loading. It does not require a new external speech API.

The new service binds **only** `/run/user/1000/cridergpt-voice/api.sock`. It has no public TCP listener. The unit uses 100% CPU quota (one core equivalent), 3 GiB memory maximum, no swap, one inference job at a time, no GPU devices or IP socket family, and a read-only private application tree. `ProtectHome=tmpfs` hides other applications' home directories and binds back only this application's files; only its state/runtime directories are writable. It runs under the existing unprivileged operator account, not root; no new Linux account was claimed or created. Only this newly created service was started/restarted while testing. Existing services stayed active.

Models stay loaded in a private subprocess. Cancellation/timeout terminates that subprocess and its process group; the next job reloads it. An invalid session cannot retrieve another owner's jobs or reference. Concurrency is bounded with 429 responses, not an unbounded queue. Transcription input is limited to 30 seconds, previews to 300 text characters / 45 seconds of output, references to 6–120 seconds / 12 MiB, enrollment to 10 active references per owner / 50 total, and inference to 10 requests per minute per owner. Standard and converted voices are explicitly distinguished. Conversion output is marked synthetic in metadata; no embedded watermark is claimed.

### Access from your PC over Tailscale/SSH

The server's verified Tailscale address is `100.106.17.103`. On your PC, keep the following terminal open:

```bash
ssh -N -L 8791:/run/user/1000/cridergpt-voice/api.sock cridergpt2026@100.106.17.103
```

Then visit **http://localhost:8791/** on that PC. This is an SSH local-port-to-remote-Unix-socket forward; it does not open a server port or modify Tailscale Serve, DNS or firewall rules. `localhost` permits browser microphone capture in supported browsers. On the server, the private console key is in `~/cridergpt-voice/state/operator.key`; copy it only into the console's password field. Do not paste keys into chat or commit them. The key stays in page memory, not localStorage; it expires after 90 days and can be rotated with the operator CLI. The console is private and independent of Lovable publication. Phones can record using their normal recorder and transfer the clip, but this localhost URL requires the forwarding client on the device opening it.

Record **30–60 seconds** of your own clean speech at a natural volume, with one speaker, no background music and no voice effects. The console can record or load audio, resample it locally to mono PCM16 WAV, record your explicit permission and intended use, enroll a private reference, preview speech, and revoke/delete the reference. It does not automatically upload your recording merely because you select it. Transcription and enrollment are separate explicit actions. Similarity, accent preservation and real-phone microphone/playback behavior still require testing with your recording. A short reference conditions the pretrained converter; it is not a from-scratch-trained speech foundation model.

### Private API and authorization

`GET /health` returns basic readiness. Other routes require a dedicated scoped voice key:

- `GET /v1/status`: actual private-worker status and current model names; public-chat integration is reported false.
- `POST /v1/jobs`: `{operation:"transcribe",audio:"BASE64"}` or `{operation:"speech",text:"…",voice_id:"stock"|"VOICE_UUID"}`.
- `GET /v1/jobs/UUID` and `POST /v1/jobs/UUID/cancel`: owner- and operation-scoped results/cancellation.
- `GET /v1/voices`, `POST /v1/voices` (PCM16 WAV, label, consent/evidence), `DELETE /v1/voices/UUID`.

Keys are SHA256-hashed in the separate voice auth database; owner identity comes from the verified key, never a supplied owner field. The server-only CLI issues and revokes credentials. The initial operator key is **not** a public browser API key for all users. Public integration must authenticate existing users and issue/broker owner-bound speech credentials; do not proxy all users as the operator. Existing Supabase call functions and CriderGPT gateway URLs were not changed by installing this service. The current public call still uses the external STT/TTS path until an explicitly reviewed integration replaces it. Private reference ownership does not automatically grant permission to publish a voice globally as the product's assistant voice.

Transient inference inputs are not written to disk or logs. Finished audio/text job results expire from memory after roughly two minutes (ten-second cleanup interval). Consent/reference recordings persist privately until revoked. Revocation invalidates jobs and deletes the copied WAV; embeddings are cleared immediately when idle or after an unrelated active job finishes. Audit records contain request ID, hashed owner identifier, operation, status and timing, not transcripts, keys, audio or consent text; they expire after 30 days. Consent/audit metadata and backups require an appropriate retention/deletion policy before public use. Signal validation does not establish speaker identity or prove that a recording contains human speech.

### Verification actually executed

`inference-probe.json` records real CPU inference, under the same one-core-equivalent / 3 GiB cap:

- Cold model load: **9.53 s**.
- Standard TTS: **1.31 s** to generate **7.86 s** of speech (RTF 0.167), one generated fixture.
- STT: **2.94 s** on that fixture; the reference phrase was recovered with EOS.
- First reference-conversion call: **7.86 s** for **2.94 s** of generated audio, including initial source/reference embedding work. This is slower than realtime; no low-latency cloning claim is made.
- Silence returned no transcript.

`service-smoke.json` records real authenticated Unix-socket stock speech, transcription, generated-reference conversion, actual cancellation, worker recovery and test-reference deletion. A second fixture had a transcription substitution (“checks” → “text”); these are functional probes, not a general WER or speaker-similarity benchmark. The runtime still needs tests with your recording and real background conditions. No human reference was used, retained or cloned. A new service peak around 1 GiB was observed; the enforced cap remains 3 GiB, not a general capacity guarantee.

Eleven enrollment/API tests passed, covering authentication before parsing audio, owner/scope isolation, consent, malformed/oversized input, preview/revocation, cancellation, backpressure, recovery and content-free audit records. The real private console passed a browser test at a mobile viewport against the live Unix API: masked key, explicit consent, empty-enrollment error, real stock speech and responsive width. No real microphone or phone audio permissions were exercised. One overlapping live probe correctly received 429; the probes then passed when serialized.

### Install, inspect, back up and remove only this service

```bash
# Plan first; explicit --apply prepares only the new private runtime and service.
python3 server/voice/prepare_runtime.py
python3 server/voice/prepare_runtime.py --apply
~/cridergpt-voice/venv/bin/python server/voice/install.py
~/cridergpt-voice/venv/bin/python server/voice/install.py --apply

systemctl --user start cridergpt-voice.service
systemctl --user stop cridergpt-voice.service
systemctl --user restart cridergpt-voice.service
systemctl --user status cridergpt-voice.service
journalctl --user -u cridergpt-voice.service -n 50 --no-pager

# Run API tests in an environment with FastAPI/httpx; no models are used by these tests.
~/cridergpt-voice/venv/bin/python -m unittest discover -s server/voice -p 'test_*.py' -v
# Deliberate real probes use generated fixtures only; run them serially.
~/cridergpt-voice/venv/bin/python server/voice/smoke_service.py
node tests/voice-console.mjs --live

# Create a least-privilege private key file; never overwrite an existing key file.
~/cridergpt-voice/venv/bin/python server/voice/manage.py issue-key \
  --owner YOUR_OWNER_ID --label 'My transcription client' --scopes stt \
  --output /private/new-voice-client.key
~/cridergpt-voice/venv/bin/python server/voice/manage.py revoke-key --file /private/new-voice-client.key

# A consistent backup requires stopping ONLY this voice service.
systemctl --user stop cridergpt-voice.service
~/cridergpt-voice/venv/bin/python server/voice/manage.py backup --destination /private/new-voice-state-backup
systemctl --user start cridergpt-voice.service

# Unregister ONLY this service; retain models/state/backups for explicit review.
systemctl --user disable --now cridergpt-voice.service
rm -- ~/.config/systemd/user/cridergpt-voice.service
systemctl --user daemon-reload
```

The installer refuses to overwrite an existing unit/code/key, preserves state on failure and does not touch other services. A private upgrade must preserve the key/state and use a reviewed, versioned code backup before restarting this unit. Restore private state only while this unit is stopped, with directories 0700/files 0600, after verifying the pinned runtime/model manifest; revocation must also be honored in retained backups. Do not remove unrelated application directories or checkpoints.

## Moving beyond the experimental text model

`model_development/pulsar/readiness_gate.py` is a read-only gate over actual results. It requires all nine original checks complete/correct, at least 90% on an independent set, no baseline regressions, and recorded human quality/safety, API isolation, load/recovery, rollback and dataset-provenance reviews before release-candidate eligibility. Even eligibility is not automatic production deployment. Its tests reject a cosmetic 9/9 when independent checks fail or generation hits a limit. Current Pulsar still fails (7/9, 6/12, a factual regression); `release-readiness.json` records the blockers. The working speech service does not upgrade Pulsar's reasoning capabilities or justify relabeling its weights as production-ready.
