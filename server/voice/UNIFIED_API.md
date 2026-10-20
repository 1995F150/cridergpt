# Backend-driven calls on the existing CriderGPT API

The draft frontend no longer owns a fixed list of voice names. `CallModeInterface` fetches the caller's catalog when opened, provides refresh, rechecks availability before microphone access and validates the selected voice again before synthesis. Text-model selection remains independent. Newly supported backend voice IDs/names can appear without another frontend voice-list edit. A removed voice causes an error; another voice/provider is never silently substituted.

## Same API, private services

The existing `CRIDERGPT_API_BASE_URL` and server-only `CRIDERGPT_API_KEY` are reused. No new hostname, public listener, paid provider, key shown to the browser or production environment change is needed. Existing chat, image and vision endpoints remain intact.

| Existing API addition | Purpose |
| --- | --- |
| `GET /v1/audio/voices` | Installed stock voices, caller-owned references and transcription availability |
| `POST /v1/audio/jobs` | Bounded `transcribe` or `speech` job |
| `GET /v1/audio/jobs/{id}` | Owner-scoped status/result |
| `POST /v1/audio/jobs/{id}/cancel` | Cancel the caller's pending speech job |

The browser uses the existing authenticated `cridergpt-ubuntu-api` function with `action: native_audio`. That function verifies the signed-in user with `auth.getUser()` and forwards their immutable ID in `X-CriderGPT-User`. It ignores body-supplied ownership. Ubuntu accepts delegation only with the existing master gateway credential; an ordinary generated Engine key cannot impersonate a user by setting this header. These first routes intentionally serve authenticated application users, not general third-party audio API keys.

`AudioGateway` creates separately scoped private speech credentials for `web_<verified-user-UUID>`. The worker's existing authorization enforces job/reference ownership. Catalogs never expose operator keys, reference paths, consent evidence or another user's references. Gateway credential files are private and their tokens are hashed in the worker database. Revoked credentials are not automatically restored. The audio gateway allows at most two concurrent response handlers to bound response buffers within the existing API memory budget. The initial credential capacity is 1,000 delegated users; the private worker's one active inference and ten jobs/minute/owner limits remain. This is an initial capacity bound, not a demonstrated public-load capacity.

The installed voice currently is Piper LJ Speech, with OpenVoice conversion for consented owned references. Only these verified capabilities are advertised. No additional pretrained voice was downloaded. The worker status contract now has `stock_voices` metadata for future installed stock voices. The gateway supports the old single-voice status format during a staged upgrade. Other speech engines need an actual backend adapter and verified model/license before being listed; adding a menu item alone does not add a model.

To make a permitted reference visible to an application user, enroll it under their exact `web_<UUID>` worker owner after explicit consent. An existing operator-owned sample is **not** automatically shared. Enrollment remains a private operator workflow, not a new public upload/voice-cloning endpoint.

Speech returns WAV parts, played sequentially after all parts are verified. The frontend preserves every character across at most eight 300-character jobs. Hang-up/timeout cancels pending audio jobs, including a job accepted after a late reply. Already accepted native text inference still has no cancellation endpoint. Incomplete/unverified native answers remain captions only. The existing conversational model API handles the text turn; no second model instance is loaded. Call transcripts are still in-memory, not a newly persisted call-history feature.

## Release state and staged deployment

This is implemented source and a tested staging artifact, **not a public deployment**. The existing public website/API/Edge functions were not restarted or republished. Keep backend routes, Edge function and frontend release coordinated; publishing only the new frontend before the audio gateway exists will show “Backend voices unavailable” and disable calling rather than use an external fallback. The old external speech functions remain available to existing clients and are not deleted.

Create a fresh stage (no overwrite, no activation):

```bash
python3 server/voice/prepare_gateway.py --output /private/new-unified-api-stage
python3 -m py_compile /private/new-unified-api-stage/server.py
```

The stage contains the exact existing gateway with one additive dispatcher, `audio_gateway.py`, `voice_gateway_auth.py`, a source-hash manifest, a reviewable diff, and `audio-filesystem.conf`. The existing API's `ProtectHome=read-only` would prevent scoped credential issuance: the staged service drop-in grants **only** `~/cridergpt-voice/state` write access. It does not open a port or change another application's files. Review that permission change and the source hash before applying. Back up the existing gateway/unit before replacing files. Activation requires the normal production-deployment approval and existing Edge deployment access; it has not happened automatically.

After approval: deploy the reviewed additive gateway files/drop-in, reload systemd and restart only `cridergpt-chat-api`; publish the updated `cridergpt-ubuntu-api` function with its existing secrets; then publish the frontend branch through the existing workflow. The source voice service's new stock-catalog metadata can be upgraded separately; the gateway's legacy status support avoids requiring a voice-service restart just to list the existing stock voice. Do not rerun the fresh-install script over an existing voice installation.

Rollback: restore the versioned gateway files/drop-in and prior Edge/frontend versions together. Leave the private speech service and enrolled references intact. Revoking a delegated key through the private operator tooling disables that caller's speech access. Do not delete voice data or production conversations during rollback.

## Verification

```bash
~/cridergpt-voice/venv/bin/python -m unittest discover -s server/voice -p 'test_*.py'
node tests/native-voice.mjs
node tests/native-audio-edge.mjs
node tests/call-turn.mjs
node tests/call-hook.mjs
npx tsc --noEmit
npm run build
# Explicit real probe, new loopback fixture listener only; no production restart:
~/cridergpt-voice/venv/bin/python server/voice/smoke_gateway.py \
  --stage /private/new-unified-api-stage --output /private/new-probe.json --live
```

`unified-api-probe.json` records the actual isolated HTTP→Unix-worker result: stock speech generated, catalog returned and cross-owner job lookup denied with 404. No human recording or public deployment was used. The frontend transport, actual Edge handler and Python gateway have isolated tests for delegation, catalog selection, invalid IDs, owner separation, revoked credentials, incomplete replies and cancellation. A real signed-in browser microphone call through the public deployment still needs acceptance testing after release.

Final checks passed: 30 voice/reference/gateway Python tests; 15 call-state checks; frontend voice transport, actual Edge auth/delegation and browser call-hook checks; 22 existing native API/Edge regression tests; TypeScript, scoped ESLint and production build. Vite retains the pre-existing large-bundle warning.
