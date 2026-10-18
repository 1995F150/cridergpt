# v6 review, verification and rollout

This branch is a review candidate, not a production deployment or a model upgrade.

## Implemented
- One React/marked Markdown renderer for every assistant provider. Raw HTML is
  escaped; links allow only HTTP(S), without embedded credentials. No generated
  code executes. A narrowly recognized Python function may be wrapped as code;
  ordinary class/import prose remains prose.
- Explicit fenced languages use highlight.js core with eight selected grammars
  (Python, JS, TS, HTML/XML, CSS, SQL, Bash, JSON), DOMPurify span/class-only
  sanitization, plain-text copy, optional line numbers, horizontal scrolling.
  Unknown languages and >50k-character code blocks use plain text, bounding cost.
- Exact backend model metadata survives saves/reload/replay. Missing historical
  identity says “Model not recorded.” No inferred parameter/context numbers.
- Owner-filtered history API: 40-conversation pages, server-side title search,
  60-message client pages (API cap 100), stable timestamp+ID cursors, chronological
  merge/dedup, persisted account-specific selection, stale-load/account guards.
- Replay steps and plays original loaded records, timestamps and model identity.
  Earlier pages can be loaded; replay never generates an answer.
- Send lock covers the entire submission, including uploads and conversation
  creation. Generation failures are explicit. A generated-but-unsaved answer is
  retained in memory for save-only retry with the same message UUID. Realtime
  inserts and save responses deduplicate by ID. It is not a durable offline queue:
  a full tab close can lose an unsaved answer; the UI warns before regeneration.
- Ordinary chat now passes its actual multi-turn history to the backend. Native
  server trimming reports history used/received; paging shows loaded-context
  limits before a new send. Full PDF export requires all older messages loaded.
- 105s generation deadline, 20s history/body deadline, no automatic inference
  retries. A timeout does not cancel backend generation or prove it stopped.
- Guest demo uses an ephemeral transcript; it no longer attempts authenticated
  storage before calling the demo endpoint. Guest history is not cross-device.
- Mobile composer uses a full-width text row, safe-area padding, 16px text to
  avoid iOS zoom, IME-safe Enter, visible send label, viewport-aware height.
  Correct Radix viewport scrolling and anchoring avoid snapping readers down.
  Chat footer is suppressed; other platform pages retain their footer.
- Inert Pin/Archive menu items are removed; the former Pinned control is replay.

## Verification commands

```sh
npm install --ignore-scripts
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:browser
# In a separate terminal, run a localhost dev preview:
npm run dev -- --host 127.0.0.1 --port 8791 --strictPort
npm run test:app
```

Browser tests intercept all fixture Supabase requests and use no production login,
private conversation, paid AI call, or live model. Screenshots are synthetic-data
previews in screenshots/. iPhone dimensions are tested in Chromium when WebKit
is unavailable; this is not proof of Safari or real-device keyboard behavior.

The live evaluation runner is OPT-IN, requires an API key in the terminal
CRIDERGPT_EVAL_API_KEY variable, and consumes server resources. `npm run eval:chat`
tests ten held-out prompt categories and records exact outputs, latency, model ID,
finish status and structural checks to a mode-0600 file in /tmp by default. It
never executes returned code. Its checks are not a model-quality certification.
Do not feed these held-out prompts into training. No live evaluation was started
as part of this branch because current public connectivity is unresolved.

## Security / production gates
- Read-only production inspection verified RLS on both chat tables and own-user
  policies. Edge routes also verify parent-conversation ownership.
- The NEW restrictive-policy migration closes direct Data API parent-ownership
  reassignment gaps and adds owner/pagination indexes. It was NOT applied.
  PostgreSQL/Supabase local runtime is unavailable here: validate the migration
  on a disposable database with two authenticated users before approving deploy.
  Check unauthorized SELECT/INSERT/UPDATE/DELETE and permitted own-user actions.
  Review existing inconsistent/orphan parent relationships using counts, not a
  dump of private messages. Index creation may briefly lock writes; schedule it.
- Read-only production inspection CONFIRMED the active hourly cleanup and its
  24-hour chat deletion. A SEPARATE proposed migration replaces cleanup_old_data
  so chat records persist while ai_interactions/imported_messages retain their
  existing 24-hour cleanup. It is NOT applied: production history still expires
  until approved. Review storage growth and retention obligations before applying.
  No deleted historical data can be recovered by the UI; restoration needs backups.
- Model metadata in client-written history is not tamper-proof provenance.
- Server/provider secrets remain exclusively in existing backend configuration.
  Subscriptions, billing, users, existing endpoints and model weights are unchanged.
- Existing rate limits stay in place; history relies on auth, RLS and bounded
  pages. No new distributed rate limiter or per-user inference queue is claimed.
- No actual Safari, authenticated cross-device production session, production
  Edge deployment, production RLS mutation or public image inference was tested.
- Production dependency audit reports 26 advisories including 1 critical; none
  reported for the selected highlight.js/DOMPurify versions. Review affected
  dependencies and reachability before production; no broad auto-fix was run.
- Build has pre-existing large-bundle / stale Browserslist warnings. Full-repo
  lint debt must be tracked separately from this chat upgrade.

## Staged deployment after approval
1. Review PR + tests; validate both proposed migrations on a disposable database; approve retention/storage growth.
2. Back up database and record currently deployed frontend/Edge revisions.
3. Apply reviewed migration and deploy chat-operations plus changed shared native
   API code in chat-with-ai/cridergpt-ubuntu-api. Use existing secrets unchanged.
4. Deploy reviewed frontend to staging. Test two accounts, search/page/rename/
   delete/replay, native model exact identity, normal and failed requests, and
   real iPhone/Android keyboard behavior. Verify actual retention configuration.
5. Only then approve a production merge/deployment. Do not publish directly from
   this development branch or invoke Lovable's build agent for this task.

Rollback frontend/Edge code to recorded prior revisions. Restore no conversation
backup for a code-only rollback. The retention fix should remain during code rollback to avoid resuming deletion. The restrictive policy can remain; if rollback
requires removing it, use only the explicit DROP POLICY in the migration comments
following access review. No model rollback or training restart is necessary.

## Separate Andromeda training recommendations
Keep 360M/step100 experimental. Compare against its unmodified pretrained base
using held-out coding, ordinary conversation, multi-turn, identity and uncertainty
prompts. Inspect chat templates, tokenization, train/validation split and identity
example balance before considering more fine tuning. Use a new output directory
and resource estimate; no training or checkpoint overwrite is part of this PR.
