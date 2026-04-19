
Goal: fix the OpenAI Apps domain verification loop by removing the fake/duplicate challenge setup and moving verification to a hostname that can actually serve `/.well-known` at the origin root.

What’s going wrong now
- OpenAI is verifying `https://udpldrrpebdyuiqdtqnq.supabase.co`.
- Supabase edge functions live under `/functions/v1/...`, so `supabase/functions/openai-apps-challenge` cannot satisfy `https://udpldrrpebdyuiqdtqnq.supabase.co/.well-known/openai-apps-challenge`.
- The static file in `public/.well-known/openai-apps-challenge` is on `https://cridergpt.lovable.app`, which is a different hostname than the MCP host currently being verified.
- There is also a token mismatch: `public/.well-known/openai-apps-challenge` uses `QoJJ...`, while `supabase/functions/mcp-server/index.ts` still has a different hardcoded token `vfxe...`.

Plan
1. Clean up the conflicting verification code
- Remove `supabase/functions/openai-apps-challenge` and its `config.toml` entry.
- Remove the old verification-token branch from `supabase/functions/mcp-server/index.ts`.
- Keep one source of truth for the challenge token only.

2. Stop using the raw Supabase hostname for OpenAI verification
- Do not verify against `https://udpldrrpebdyuiqdtqnq.supabase.co` anymore.
- Use a domain you control for the MCP hostname instead, because that is the only way to serve `/.well-known/openai-apps-challenge` at the true origin root.

3. Put a thin proxy in front of the existing `mcp-server`
- Recommended hostname: `mcp.yourdomain.com` or `api.yourdomain.com`.
- The proxy will:
  - return the exact token at `https://mcp.yourdomain.com/.well-known/openai-apps-challenge`
  - forward MCP requests to `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/mcp-server`
  - preserve MCP-required headers for POST requests:
    - `Accept: application/json, text/event-stream`
    - `Content-Type: application/json`

4. Update OpenAI settings to the new real MCP origin
- MCP server URL: the proxied domain
- Challenge Base URL: the same origin or its parent origin
- No path in the Challenge Base URL

5. Verify end to end
- Confirm `/.well-known/openai-apps-challenge` returns HTTP 200 with the exact token.
- Confirm the proxied MCP endpoint responds to `initialize` / `tools/list`.
- Retry OpenAI verification after the proxy is live.

Technical details
- There is no value you can paste into the current Supabase-base-URL setup that will make verification pass reliably, because you do not control the root `/.well-known` path on the Supabase project hostname.
- The current extra function is redundant and misleading: it works only at `/functions/v1/openai-apps-challenge`, not at the root URL OpenAI checks.
- The stale token inside `mcp-server` should be removed even if the proxy solution is used, to avoid future conflicts.

Implementation outcome after approval
- I’ll clean the repo so there is only one valid verification approach.
- I’ll prepare the MCP side to sit cleanly behind a proxy.
- The only external step will be the one-time proxy/domain setup, because that part cannot be solved from this codebase alone.