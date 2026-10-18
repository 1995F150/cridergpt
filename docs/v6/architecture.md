# CriderGPT v6 chat upgrade

Inspected 2026-10-17. Repository: 1995F150/cridergpt. Production/default branch:
main, baseline 3704ed13e49f0b650512e19891891cf04ddd4414. Lovable project
b29c4dc8-6522-4e29-a937-ab29b9b50283 reports the same revision. Development
branch: codex/v6-chat-reliability. GitHub PR workflow avoids invoking Lovable's
build agent, spending its credits, or publishing unreviewed changes.

## Existing architecture and observed gaps
- Vite / React 18 / TypeScript / Tailwind / shadcn. Index lazy-loads ChatPanel.
- ChatPanel coordinates useChat (history), useAILearning (inference), model
  selection, images, document exports and existing task/memory tools.
- Supabase Auth supplies the user JWT; chat-operations uses an anon client with
  that JWT and explicit user_id filters. chat_conversations + chat_messages,
  metadata JSONB, timestamps, Realtime subscriptions. Existing IDs support
  duplicate-write detection. No new database is necessary for replay/pagination.
- chat-with-ai routes native model IDs through the Ubuntu API using backend
  secrets. Selected native models do not silently fall back to cloud providers.
- Native answers already use marked tokens rendered through React (not raw HTML).
  Non-native messages use a separate incomplete parser with trimmed code and no
  highlighting. History is unbounded; fetches can race conversation changes.
- ChatPanel constructs ordinary multi-turn history but omits it from inference.
  It labels waiting state as streaming although native responses are JSON.
- Sidebar has rename/delete/title search, plus inert Pin/Archive controls.
- Mobile outer layout uses h-screen and an independently scrolling page/footer;
  Radix scroll ref points to the root, not the scrollable viewport.

## Read-only security findings
Live pg_class confirms RLS on both chat tables. Live pg_policies confirms own-user
SELECT/INSERT/UPDATE/DELETE policies. Message policies check user_id only, while
chat-operations additionally verifies conversation ownership before inserting.
A direct Data API client can attempt rows against another conversation ID; a
restrictive ownership policy is recommended separately. No production policy was
changed in this upgrade. Do not treat persisted model metadata as cryptographic
proof: clients can currently insert assistant messages into their own history.

Read-only production checks CONFIRMED an active cleanup-old-data-hourly job and
public.cleanup_old_data() deleting chat_messages/conversations older than 24h.
This is a production blocker for persistent history. The branch proposes a
separate migration that removes only chat purges, retaining other cleanup. It
was NOT applied. No running job, production schema, account, payment system or
production environment variable was changed. Review storage growth before deploy.

## Implementation and verification plan
1. Shared escaped Markdown + bounded language highlighting, copy, line numbers.
2. Stable model metadata, conversation search/pagination, chronological message
   pagination, persisted replay, and stale-fetch/account-change protection.
3. Guard concurrent sends, preserve unsaved replies for save-only retry, pass
   actual context, and make failures/loading explicit without fake streaming.
4. Mobile viewport/keyboard sizing and scroll anchoring; preserve blue/gold theme.
5. Rendering, request, pagination, ownership and replay regression tests, browser
   fixtures, type/lint/build checks; report pre-existing failures separately.
6. Push development branch and open a review PR. No production deployment/merge.

Model weights are untouched. Model-quality evaluation and training are distinct
from transport/rendering tests. A functional UI does not establish model quality.
