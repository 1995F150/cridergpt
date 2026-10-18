# Cross-platform history sync — staged, not deployed

The website stores conversations, messages and AI memory in Supabase. Local Chat uses `/opt/cridergpt-engine/data/local_chat.sqlite3`. Inference requests previously provided no durable bridge between them. Lovable is the editor; Supabase is the cloud history source.

This proposal adds an enrolled-account cloud outbox, a backend-only export function, an unprivileged retrying worker and additive local replica tables. Imported conversations appear in existing history/search/replay and are read-only. Source IDs, model identifiers and recorded timestamps are preserved. Missing metrics are not fabricated. Local imports commit before acknowledgement; replayed events are deduplicated. Tombstones prevent stale backfills from resurrecting deleted records.

## Privacy and scope

No real account is enrolled or linked by these source files. Confirm the exact Supabase user UUID and local account before activation. Other users stay separate. Cloud access requires both explicit database enrollment and a server-side UUID allowlist, plus a dedicated export secret distinct from inference credentials. No browser receives that secret. Acknowledged spool payloads are cleared.

Cloud memory is mirrored as unverified data, separately from active local memories. Users can explicitly save an edited, reviewed fact through existing authenticated memory controls. Training review produces unapproved candidates only; it does not train models or authorize data use. Redaction heuristics require human review and do not guarantee removal of every sensitive fact or incorrect answer.

Optional gateway journaling captures requests routed through this CriderGPT gateway. Managed integration keys have separate namespaces; optional `client_user_id` is an integration assertion, not authenticated website identity. Supply stable `conversation_id` for multi-turn history. Explicitly map returned opaque `history.source_account` identifiers before importing. Shared master-key traffic records operational metadata only; website content is imported using verified Supabase user IDs. Unrelated ChatGPT, Facebook or GitHub conversations are outside this integration. Image binaries and attachments are not replicated; authorized HTTPS source attachment links are displayed without automatic fetching.

This is one-way replication to one destination, not bidirectional editing or multi-server broadcast. Existing retention/backups can retain recovery copies; deletion does not promise secure physical erasure.

## Validation

On this existing server, from the repository root:

```bash
python3 server/history_sync/prepare_local_patch.py
python3 server/history_sync/prepare_gateway_patch.py
PYTHONPATH=/opt/cridergpt-engine /opt/cridergpt-engine/venv/bin/python -m unittest discover -s server/history_sync -p 'test_*.py'
PYTHONPATH=/opt/cridergpt-engine /opt/cridergpt-engine/venv/bin/python server/history_sync/test_existing_api.py
node --test tests/history-sync/edge.test.mjs
node --check server/history_sync/stage/platform.js
npx eslint supabase/functions/history-sync/index.ts
```

Tests use isolated temporary databases and fixture requests. Stage files are generated from installed versions with before/after hashes, and ignored by Git. This package intentionally targets the inspected existing installation rather than claiming portable compatibility with every Engine version.

SQL migration/trigger behavior still requires disposable PostgreSQL execution and live scoped RLS verification. Unit tests do not establish real cloud delivery, browser end-to-end behavior or production readiness.

## Deployment gates and sequence

Production deployment, database changes, secret configuration and service restarts require approval. These commands are documentation, not actions already executed.

1. Confirm owner mapping and retention. Existing `cleanup-old-data-hourly` invokes a function deleting messages/conversations older than 24 hours. Review/apply the independent `20261018011052_v6_preserve_chat_history.sql` proposal before enabling sync; retain the unrelated existing cleanup. Review storage growth and backups.
2. Test and apply `20261018030737_durable_history_sync_outbox.sql`. It starts with an empty enrollment table and no backfill. Use approved administrative SQL to enroll only the confirmed UUID in `public.history_sync_accounts` with enabled=true. Never enable all users implicitly.
3. Inspect the local plan:

   ```bash
   python3 server/history_sync/install.py --cloud-user CONFIRMED_UUID --local-user owner
   ```

   Only after approval, run the same command with `sudo` and `--apply`. It backs up SQLite and patched files, installs protected configuration plus a restricted worker unit and restarts only Engine once. It leaves the sync worker stopped. Existing installations are not overwritten.
4. Using authorized Supabase CLI access, upload `/etc/cridergpt-history-sync.env` securely with `supabase secrets set --env-file /etc/cridergpt-history-sync.env --project-ref udpldrrpebdyuiqdtqnq`, then deploy `history-sync` with JWT verification disabled as configured. Its dedicated secret authentication remains required. Never paste this file into chat, Git, browser code or command arguments. Keep the CLI environment's permissions protected.
5. If gateway journaling is approved, first wait for image jobs to finish. Inspect `python3 server/history_sync/install_gateway.py`; then explicitly apply with root access and `--key-source /etc/cridergpt-history-sync.key`. This restarts only the public API user service, verifies its health and restores code on failure. Register only approved API namespaces in the worker's `api_links`.
6. As the unprivileged `cridergpt` service account, run `/opt/cridergpt-engine/venv/bin/python -m native_chat_integration.history_sync.worker --config /etc/cridergpt-history-sync.json --backfill --once` from `/opt/cridergpt-engine`. Check the authenticated Synced History page, imported records, account isolation and deletion behavior. The first backfill must precede continuous operation.
7. Only after verification: `sudo systemctl enable --now cridergpt-history-sync.service`. Inspect content-free worker logs using `journalctl -u cridergpt-history-sync.service`. Stop with `sudo systemctl stop cridergpt-history-sync.service`.

## Verification and rollback

Send a website fixture such as “My truck's reported rear ratio is 3.55:1.” Verify both messages arrive once in the linked user's Local Chat history, search finds the ratio, model metadata matches the original reply, refresh/retry does not duplicate it, and a different account cannot read it. Edit/delete at the source and verify propagation; test an unavailable cloud endpoint and subsequent recovery. Test direct API history separately with an explicitly linked integration namespace. Do not use a real secret as fixture content.

For rollback, stop/disable only the new worker. Restore patched Engine or gateway source files from their installation backup, preserving ownership, and restart only the affected service. Installers restore code on failure and preserve captured data. Do not restore an old database over newer conversations, drop history tables, remove model data, revoke existing inference keys or alter unrelated services. Removing cloud triggers/function/enrollment requires a separately reviewed migration; disabling enrollment stops new capture but does not erase already pending payloads. Review remaining spool and backups under the retention policy.

## Model switching investigation (2026-10-18)

The inspected Local Chat handler accepts a model per request, retains the conversation ID, includes recent exchanges regardless of their originating model, and saves each assistant's actual model separately. The website native route likewise forwards prior role/content turns. No evidence currently establishes that switching itself resets history. A contradictory coding refusal is a model-output failure, not proof of a selector defect.

The staged local patch now excludes known incomplete, image and pipeline-error exchanges from generation context without deleting saved history. Original adjacency is respected so orphan questions cannot attach to the wrong reply. Valid exchanges from other models are retained. Four regression tests include execution of the staged real send handler with fixture transports: A → B → A keeps one conversation, forwards accumulated history and records each model correctly. These tests do not load weights or establish equivalent reasoning quality across models. Context windows still bound retained history (the local adapter retains at most four complete pairs, and inference may trim further).

This helper is installed only with the reviewed local patch; it is not active on the server yet. Website and cloud database behavior are unchanged by this follow-up. Do not treat this as activation of Supabase history sync or as model fine-tuning.
