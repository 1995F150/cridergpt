# Why Call Mode takes forever

## Root cause

`src/hooks/useCallMode.ts` invokes a Supabase edge function named **`realtime-token`** — but that function does not exist. The actual deployed function is **`openai-realtime-token`** (see `supabase/functions/openai-realtime-token/` and `src/hooks/useRealtimeCall.ts`, which calls the correct name).

Result: when you tap Call, the browser:
1. Asks for mic permission (works).
2. Creates the WebRTC offer (works).
3. Calls `supabase.functions.invoke("realtime-token", ...)` → returns a 404 / function-not-found error.
4. Because the SDP exchange with OpenAI never happens, the peer connection never reaches `connected`, so `isConnecting` stays true and the UI just sits on "Connecting…" until the network call eventually errors out — which feels like "forever."

Secondary smell: the call_logs row is inserted *after* the SDP exchange, so failures leave no log entry, making it look like nothing happened.

## Fix

Single-line rename in `src/hooks/useCallMode.ts`:

```text
supabase.functions.invoke("realtime-token", { ... })
                  →
supabase.functions.invoke("openai-realtime-token", { ... })
```

Also update the error message string on line 402 ("Missing ephemeral client secret from realtime-token") to reference `openai-realtime-token` so future logs are accurate.

## Verification

1. Open Call Mode, tap Call.
2. Check browser console: should see `pc.connectionState: connecting → connected` within a couple seconds.
3. Confirm a row appears in `call_logs` with `start_time` set.
4. If it still hangs, pull `openai-realtime-token` edge function logs to confirm the ephemeral key is being minted and `OPENAI_API_KEY` secret is set.

## Scope

- Edit: `src/hooks/useCallMode.ts` only.
- No DB migrations, no edge function changes, no UI changes.
