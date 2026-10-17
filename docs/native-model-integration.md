# Native models in the existing public chat

The existing chat and selector now discover the Ubuntu API's available text models. The browser uses `native:<exact API ID>` to distinguish them from existing configured cloud models. The server removes only that prefix and verifies the selected ID against `/v1/models`; unavailable or mismatched checkpoints fail without a replacement model.

Verified origin catalog: `nova-candidate3` (2.1 Nova), `nebula-2.5-1000` (2.5 Nebula), `andromeda-3.0-360m-100` (3.0 Andromeda). All remain experimental. A serving integration does not establish model quality. A real baseline produced an irrelevant response from Nebula, a greeting from Nova, and `4` from Andromeda for `What is 2 + 2?`.

## Request flow and access

Signed-in chat -> `chat-with-ai` native branch -> existing `CRIDERGPT_API_BASE_URL` + `CRIDERGPT_API_KEY` -> Ubuntu `/v1/chat`. Native requests bypass cloud, corpus-answer and creator-keyword substitution. Existing anonymous demo and non-native models keep their paths. No new Lovable AI build turn or API key is needed. Existing hosting/bandwidth charges still apply.

The branch validates the user JWT, kill switch, configured safety keywords and existing plan usage. The origin also limits concurrency and request rate. Daily usage uses the existing read/update counter; globally atomic quotas are not implemented here. The message-based per-account burst check is supplemental, not a distributed API request counter.

`cridergpt-ubuntu-api` exposes `public_models` to signed-in users and `native_image_job` only with an owner-bound, expiring HMAC job token. Existing diagnostic actions remain admin-only. The shared API key never reaches the browser. Existing JWT-verification settings are retained because each function validates authorization in its body.

The origin may route an explicit image prompt to separately identified Stable Diffusion 1.5. Jobs are polled through the bridge; no callback URL is required. Image recognition uploads are rejected for native text checkpoints. Completed PNGs are saved in the existing private message image field; base64 increases database storage and is a limit for high-volume image use. This change does not create a public bucket.

The origin can provide an explicitly labeled deterministic source summary when web synthesis fails. The UI preserves that label, citations and incomplete flags. It never presents a source summary as generated checkpoint text. Unsupported search remains a visible error.

## History and rendering

Messages persist through the existing owner-checked/RLS-scoped `chat-operations`. Assistant metadata records actual/requested model, source, request ID, finish status and timing where available. Client message IDs prevent repeated saves of the same request. No database migration or old-history rewrite is needed. Native metadata is distinguished from old message metadata by `provider: cridergpt_native`.

Native Markdown uses a lexer and React elements, not raw HTML. Code has copy controls and citations link to retrieved HTTP(S) sources. The native API currently returns complete JSON, not a token stream; the chat shows a waiting indicator rather than pretending to stream. The origin enforces model context limits; the adapter retains up to eight whole dialogue pairs and rejects oversized latest messages.

## Verification

```sh
npm ci --ignore-scripts
npm run build
npx tsc --noEmit -p tsconfig.app.json
node --test tests/native-chat/*.test.mjs
```

`tests/native-chat/browser.mjs` exercises the real selector, native client and message renderer with isolated network/auth fixtures using the server's installed Playwright. It does not prove a real user's public JWT session. `tests/native-chat/smoke-origin.mjs` tests the actual origin checkpoints using the existing private key internally; it does not print the key.

After publication, sign in normally at cridergpt.com, select each Native/Experimental model, send a fresh prompt, refresh, and confirm the persisted exact model badge. Check Python code copying, a web query on Andromeda, and an image prompt. Confirm a different account cannot read the conversation or poll an intercepted image-job token. Anonymous visitors must not invoke native inference. No credentials or user sessions were manufactured for testing.

## Deployment and rollback

Deploy `chat-with-ai`, `cridergpt-ubuntu-api` and `chat-operations` with their relative dependencies before publishing the frontend. No Ubuntu inference restart or model file modification is needed. Preserve `verify_jwt: false` for these existing functions; body-level authorization is required and tested.

Before this change the Edge Function versions were respectively 342, 6 and 245. Exact deployed source backups are outside the repo at `/home/cridergpt2026/cridergpt-public-chat-deployment-backup/functions`. To roll back, redeploy those saved sources under their original function names and revert the frontend integration commit, then republish the existing project. Existing conversations and checkpoints remain intact. Do not restore a stale whole database to undo this code-only release.
