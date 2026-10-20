# Local native-model call bridge — 2026-10-19

The functional operator bridge is installed at `~/cridergpt-voice/code/call_bridge.py`. It connects the running private speech API to the **existing authenticated loopback chat API** at `127.0.0.1:8772`. It loads no text model, changes no public hostname and has no external fallback. No existing service was restarted for this addition. The draft public call client now also withholds native speech when termination metadata is absent or a token limit is recorded. The public phone button still uses the previous Supabase speech functions; this CLI is not a public call-session server.

The flow is local audio → Whisper transcription → exact registered native checkpoint → Piper speech or an explicitly enrolled OpenVoice reference. The text model and voice selection are independent. An owner's reference UUID can be used with any supported native text model; no per-text-model voice training is needed. A stock voice remains labeled stock until a real authorized reference is enrolled.

## Actual integration checks

`native-call-probe.json` records real sequential requests using a locally generated greeting recording, not a human sample. Andromeda and Nebula returned the exact requested model IDs, EOS and generated WAV output. Nova returned text but no finish reason, so no audio was generated. This tests routing and execution, **not answer correctness or human voice similarity**. The service's one-job backpressure and rate limits remain enforced.

The Nova metadata gap is confirmed in the legacy `native-chat-integration/runtime.py`: its return object contains text, checkpoint and token count but no finish reason/incomplete flag. The legacy worker also slices context and splits decoded special-token markers without reporting those events. The call bridge deliberately does not infer EOS from a short answer. Fixing and deploying that shared runtime requires EOS/token-limit/context diagnostics and isolated legacy-checkpoint tests; it was not silently restarted or relabeled as complete here.

The bridge retains history across a supplied JSON list, appends the newest user question once, validates returned model identity, and refuses to speak incomplete/unknown termination. Answers are split without dropping characters into at most eight 300-character speech jobs. If any part fails, partial audio is withheld and text remains available. Audio does not play automatically. Ctrl-C/deadline cancels the pending speech job; the existing native API does **not** expose cancellation, so an already accepted native inference can finish in the worker. Do not claim full call cancellation until that contract exists.

## Local operator use

Run on the server, outside Git, with a new output directory. Credentials are read from private files and never printed. Do not send these operator keys to a browser or use them to impersonate public users.

```bash
python3 ~/cridergpt-voice/code/call_bridge.py \
  --audio /private/utterance.wav \
  --model andromeda-3.0-360m-100 \
  --voice-id stock \
  --chat-key ~/cridergpt-chat-api/private/api-key \
  --output /private/new-call-result
# With an owned enrolled reference, replace stock with that voice UUID.
# --history /private/history.json accepts a user/assistant JSON array (max 10).
```

The fresh 0700 result directory contains 0600 transcript/response/history metadata and WAV files. These are private conversation data: delete when no longer needed and exclude from version control. Keys, transcripts and output audio are not included in the committed probe report.

## Public integration still required

Use the existing authenticated gateway, verified caller ID and native model allowlist, with a server-managed mapping to each user's scoped voice identity. Do not share the operator voice key, accept client-supplied owner IDs or grant use of another user's reference. The current voice service has private preview credentials, not a public identity federation contract. A coordinator needs session/turn IDs, bounded concurrency, actual job cancellation, per-owner persistent conversation writes, recording duration limits, idempotency and explicit local/unavailable capability status. Keep external speech a separate explicit option. Browser microphone → real user voice → native answer → playback has not yet been tested.

## Checks

20 voice/reference/bridge unit tests, ten vision tests, 13 call-turn checks and the real call-hook browser checks passed. The frontend production build and TypeScript check passed. Vite retains its existing large-bundle warning. No model weights were modified. The visible image-label and static-hint CSS changes are in the development branch and need the normal website publication process; they are not claimed live.
