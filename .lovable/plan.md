# CriderGPT ↔ Ubuntu Backend ↔ Engine: Architecture Report and Phased Plan

This is a report only. Nothing is deployed, migrated or removed. Items marked **[UNVERIFIED]** could not be confirmed from this project's files.

## 1. Current architecture (verified)

- **Frontend:** React 18 + Vite + TypeScript + Tailwind (`src/`). Native apps: Kotlin `android_app/`, SwiftUI `ios_app/`. Both call the same backend.
- **Auth:** Supabase Auth (Lovable Cloud), project `udpldrrpebdyuiqdtqnq`. Web client: `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`. Google/GitHub/X/Spotify use popup OAuth.
- **Database/storage:** Supabase Postgres with RLS, plus Supabase Storage. Chat tables: `chat_conversations`, `chat_messages` (used by `supabase/functions/chat-operations/index.ts`), `ai_memory`, `ai_usage`, `ai_infrastructure_settings`, `engine_runtime_status`.
- **Edge Functions:** about 75 functions in `supabase/functions/`. The ones that matter here are `chat-with-ai`, `chat-operations`, `home-server-proxy`, `cridergpt-public-api`, `cridergpt-api`, `generate-ai-image` and `demo-chat`.
- **Current Engine connection:** `supabase/functions/chat-with-ai/index.ts`.
  - It reads the URL from `ai_infrastructure_settings.engine_base_url`, or from the secret `CRIDERGPT_ENGINE_URL` if that is missing. The key comes from the `CRIDERGPT_ENGINE_API_KEY` secret and is sent as the `X-API-Key` header.
  - It calls `POST {ENGINE}/chat` in engine-only mode (no cloud fallback). The timeout comes from `engine_request_timeout_ms`, default 120 s.
  - For images it calls `POST {ENGINE}/image/generate` and `/image/analyze`, and falls back to the Lovable AI Gateway if those fail.
  - It writes health information to `engine_runtime_status`.
  - The Engine answer is read from `response`, `reply`, `text` or `message`. Replies are **not streamed**: the full JSON comes back at the end.
- **Other Engine paths:** `cridergpt-public-api` uses `_shared/hybrid-router.ts` to reach a local Ollama, then falls back to the Gateway. `home-server-proxy` exists **[UNVERIFIED: what it targets]**.
- **Ports 8765 and 8766:** neither port appears anywhere in this project. That is good, and it should stay that way.

## 2. Required backend features

**Existing, and must keep working:**
- Chat: send a message, get a reply, keep history (last 20 turns).
- Conversations: create, list, rename and delete conversations and their messages.
- `ai_memory` writes.
- Daily usage limits through `ai_usage` and plan tiers (Free/Plus/Pro/Lifetime).
- Image generation and image recognition.
- File and image uploads to Storage.
- Source badges in the UI.
- Engine health panel.

**Proposed additions:**
- Streaming replies (SSE).
- Cancelling a reply that is in progress.
- Request IDs for tracing.
- Per-user rate limits enforced on Ubuntu.
- A versioned API contract with the Engine.

## 3. Authentication and permissions

- The browser keeps using Supabase Auth and sends its access token as `Authorization: Bearer <JWT>`.
- The Ubuntu backend (port 8766, reached through `api.cridergpt.com`) checks that token against the Supabase JWKS at `https://<project>.supabase.co/auth/v1/.well-known/jwks.json` (asymmetric signing keys). It falls back to `GET /auth/v1/user` if that is unavailable. The user ID always comes from the verified `sub` claim. Any `user_id` sent in the request body is ignored.
- Data access has two options:
  - (a) Call Supabase with the user's own JWT, so RLS applies. This is the default.
  - (b) Use the service role only for server-only jobs, always adding an explicit `WHERE user_id = sub`.
- Admin checks use the existing roles table or RPC. The browser's claim of being an admin is never trusted.
- **Only server-side code holds secrets:** the Ubuntu backend `.env` and Supabase Edge Function secrets. The Engine key, service-role key and Gateway key never reach the frontend, local storage or mobile apps.
- The Engine (8000) and Command Center (8765) bind to `127.0.0.1` only. Only the backend, through a Cloudflare Tunnel or reverse proxy, is public.

## 4. API contract (backend, `/v1`)

All responses are JSON. Errors use this shape: `{ "error": { "code", "message", "request_id", "retryable" } }`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health` | Liveness check, plus Engine reachability |
| GET | `/v1/me` | Verified user, plan and today's usage |
| GET | `/v1/conversations?cursor=&limit=20` | Keyset pagination: `{ items, next_cursor }` |
| POST | `/v1/conversations` | `{ title? }` returns a conversation |
| PATCH/DELETE | `/v1/conversations/{id}` | Rename or delete (owner only) |
| GET | `/v1/conversations/{id}/messages?before=&limit=50` | Paginated message history |
| POST | `/v1/chat` | `{ conversation_id?, message, model?, image_url?, stream? }` |
| POST | `/v1/chat/{request_id}/cancel` | Abort an in-flight Engine call |
| POST | `/v1/images/generate` / `/v1/images/analyze` | Same fields `chat-with-ai` uses today |

**Non-streaming `/v1/chat` response:** `{ request_id, conversation_id, message_id, response, source: "engine", model, latency_ms, usage: { used, limit } }`

**Streaming (`stream: true`):** `text/event-stream` with these events:
- `meta` with `{request_id, conversation_id}`
- `delta` with `{text}`
- `done` with `{message_id, model, usage}`
- `error` with `{code, message}`

Heartbeat comments are sent every 15 s.

**Status codes:**
- 400: invalid input
- 401: bad or expired token
- 403: not the owner, or plan not allowed
- 404: not found
- 429: usage or rate limit reached (with `Retry-After`)
- 499: client cancelled
- 503 `engine_unavailable`: Engine down or disabled
- 504 `engine_timeout`: Engine took too long
- 502 `engine_error`: the Engine returned a bad or empty reply

## 5. AI Engine integration (item 7)

```text
Browser ──JWT──> api.cridergpt.com (Ubuntu backend :8766)
                   │ verify JWT → load plan/usage → save user msg
                   │ build prompt (persona + ai_memory + last 20 turns)
                   ├──X-API-Key, 127.0.0.1──> Engine :8000  (/chat, /chat/stream)
                   │ stream deltas back, save assistant msg, bump ai_usage
                   └──> Supabase Postgres (source of truth)
```

**Request order inside the backend:**
1. Verify the user's token.
2. Check the rate limit and daily quota, before calling the Engine.
3. Save the user's message (status `pending`).
4. Call the Engine with a timeout (connect 5 s, first token 30 s, total taken from `engine_request_timeout_ms`).
5. Save the assistant reply. If the stream breaks partway, save the partial text with status `incomplete`.
6. Increment usage only when a reply succeeds.
7. Write to `engine_runtime_status`.

**What the Engine already has (from the current calls):** `POST /chat` returning JSON with a `response` field; `X-API-Key` auth; `/image/generate` and `/image/analyze`.

**Engine changes needed [UNVERIFIED that any of these exist yet]:**
- `POST /chat/stream` (SSE or NDJSON token stream).
- `GET /health` returning model and version information.
- Honouring a `request_id` and supporting cancellation when the client disconnects.
- Making `conversation_id` optional (the earlier 422 error came from this).
- A stable reply shape: `{response, model, latency_ms, usage?}`.
- Binding to `127.0.0.1`.
- Treating `user_id` as information only: the backend is the authority on who the user is.

**Clear user-facing messages:**
- "CriderGPT Engine is offline right now — try again in a minute." (503)
- "The Engine took too long to answer." (504)
- "Daily limit reached for your plan." (429)

The UI keeps its existing source badges.

**Merging Engine code into the backend later:** not recommended now. Keeping them as separate services means model reloads, GPU or CPU crashes, and restarts don't take down auth or conversations. It also lets each scale or restart on its own and keeps the Engine's dependencies isolated. The only real gain from merging is avoiding one localhost hop (about 1 ms), which is negligible next to inference time. Reconsider only if both services are always deployed together and the boundary becomes a maintenance burden.

## 6. Keep vs. move

- **Keep on Supabase/Lovable Cloud:** Auth and OAuth, Postgres as the source of truth, Storage, Stripe and Play webhooks, email, and every Edge Function that has nothing to do with chat.
- **Move to Ubuntu:** chat orchestration (prompt building, Engine calls, streaming, saving), plus per-user rate limiting. Image endpoints move later.
- **Stays as a fallback:** `chat-with-ai` keeps working unchanged during the move.

## 7. Phased rollout

1. **Phase 0 (prep):** back up the database (the existing 6-hour local backup plus a manual dump). Document the Engine's current request and response shapes. Confirm the domain.
2. **Phase 1 (backend, read-only):** stand up `/v1/health`, `/v1/me` and conversation listing with JWT verification, behind the tunnel. Not wired to the website yet.
3. **Phase 2 (chat without streaming):** `/v1/chat` calling the existing Engine `/chat`. It writes to the same `chat_conversations`, `chat_messages`, `ai_usage` and `ai_memory` tables, so no data migration is needed.
4. **Phase 3 (website switch behind a flag):** a new `chat_backend` setting in `ai_infrastructure_settings` (`edge` | `ubuntu`). Turn it on for the owner account first, then for everyone. **Rollback:** flip the flag back to `edge`.
5. **Phase 4 (streaming):** add Engine `/chat/stream`, backend SSE, and incremental rendering in the frontend.
6. **Phase 5:** move image endpoints. Then point the native apps at the backend.

## 8. Configuration (names only)

- **Ubuntu backend `.env`:**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server jobs only)
  - `CRIDERGPT_ENGINE_URL` (`http://127.0.0.1:8000`), `CRIDERGPT_ENGINE_API_KEY`
  - `ENGINE_CONNECT_TIMEOUT_MS`, `ENGINE_FIRST_TOKEN_TIMEOUT_MS`, `ENGINE_TOTAL_TIMEOUT_MS`
  - `ALLOWED_ORIGINS` (cridergpt.com, www, preview), `RATE_LIMIT_PER_MIN`, `LOG_LEVEL`, `BIND_HOST=127.0.0.1`, `BIND_PORT=8766`
- **Engine `.env`:** `ENGINE_API_KEY` (same value as above), `BIND_HOST=127.0.0.1`.
- **Supabase Edge secrets (existing, unchanged):** `CRIDERGPT_ENGINE_URL`, `CRIDERGPT_ENGINE_API_KEY`, `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Frontend (public, safe):** `VITE_CRIDERGPT_API_BASE_URL` (for example `https://api.cridergpt.com`). Nothing secret.

## Unverified items

- The Engine's actual routes, streaming support and health endpoint.
- What `home-server-proxy` targets.
- The final domain.
- Whether the Engine binds to localhost today.
- The exact columns of `chat_messages` (needed for the `pending`/`incomplete` status, which may require a migration).
