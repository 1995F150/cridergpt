# Verification results

Baseline: production main 3704ed13e49f0b650512e19891891cf04ddd4414.
Development branch: codex/v6-chat-reliability. No production deployment.

| Check | Result |
|---|---|
| Unit/rendering/Edge regression suite (`npm test`) | 42 tests passed |
| Browser component + real history-hook fixtures | 33 assertions passed at iPhone, Android, desktop sizes |
| Full existing application smoke (mocked Supabase only) | Demo submit + second submit, code rendering, exact model metadata, no page errors/overflow, composer visible at keyboard-sized viewport |
| TypeScript (`npm run typecheck`) | Passed |
| Focused chat/core lint (`npm run lint:chat-v6`) | Passed, no errors/warnings |
| Production Vite build | Passed; existing large bundle and outdated Browserslist warnings |
| Whitespace (`git diff --check`) | Passed |
| Repository-wide lint | Fails: 848 errors in last full check; unchanged main had 856 errors. This PR does not resolve unrelated platform lint debt. |
| Live RLS metadata (read-only) | Both history tables RLS-enabled with own-user policies |
| Live retention metadata (read-only) | Active hourly cleanup confirmed; cleanup_old_data deletes chats older than 24h |
| Proposed RLS/index and retention migrations | Prepared for review, NOT applied; disposable PostgreSQL validation still required |
| Actual model weights / generation quality | Not modified; no live model-quality scores claimed |

Browser screenshots use synthetic data and carry no private conversation or key.
WebKit was not installed; iPhone dimensions ran in Chromium, not actual Safari.
No arbitrary generated code was executed. No live paid inference was requested.
Authenticated cross-device production and real mobile keyboard tests remain release gates.
The automated browser fixtures replace auth/database responses; they do not verify live RLS.

Changes touching chat privacy, auth, per-user query filters, raw HTML escaping,
unsafe URLs, model identity, duplicate saves, stale history results, account clearing,
and server-owned credentials were reviewed. React checks covered hook dependencies,
cleanup, memoization, stable list keys, keyboard labels, bounded grammar loading,
long-code highlighting limits and mobile overflow. Existing broader legacy hook/lint
warnings are not represented as a production-ready security certification.

Dependency audit (`npm audit --omit=dev`): 26 reported advisories (1 low, 5 moderate,
19 high, 1 critical) in the dependency graph. No advisory was reported for the
selected highlight.js or DOMPurify versions. No automatic audit fixes were run;
review reachability and upgrade affected packages separately before production.
