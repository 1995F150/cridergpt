# Andromeda repeated-response investigation — 2026-10-19

## Outcome and limits

Three confirmed implementation defects are fixed in this branch/staged deployment patches. The specific “No, I'm not a monkey” incident was **not reproduced** with clean requests, including an explicitly seeded prior assistant turn containing that phrase. These fixes must not be described as proof that the model's training caused, or now resolves, that incident. No weights, tokenizer assets, checkpoints, datasets, live services, or production configuration were changed. No canned responses or phrase filters were introduced.

## Trace and evidence

- Public native chat: `ChatPanel` → `useAILearning` → authenticated Supabase native bridge (`_shared/native-api.ts`) → `/v1/chat` → loopback worker → `SelectorRuntime` → `CandidateServing`. Public history is stored through `useChat` / `chat-operations`, separate from inference.
- Private Local Chat: Engine `/local-chat/send` → owner-scoped history → at most four complete prior exchanges → selected provider/worker → stored assistant result plus operational telemetry.
- The public gateway accepts the selected registered model, rejects mismatched returned model/checkpoint SHA, and has no response cache. Resident models and per-call generation KV caches do not constitute a cross-request response cache. Each tested HTTP response had a distinct request ID and inference request ID.
- `candidate_serving.py` checks checkpoint SHA, finite parameters and tokenizer vocabulary bounds; serializes a fresh prompt per request; decodes only newly generated tokens. Generation is bounded (Andromeda registry default 192 new tokens, adapter maximum 256, 40-second generation limit); greedy decoding and tokenizer/model EOS safeguards remain unchanged. HTTP calls use bounded JSON, **not token streaming**; the gateway explicitly rejects `stream:true`. The frontend persists the returned response rather than parsing a token stream. No evidence of transport truncation was found in these reproductions.
- Recent user-service journals returned no structured inference events accessible in this investigation. The original failing request could not be correlated to its original prompt/history/checkpoint. Production message content was not dumped. New diagnostics are intended to make the next incident traceable.

### Confirmed defects

1. **Tokenizer return-type mismatch:** installed Transformers 5.13 returns a dictionary-like encoding from `apply_chat_template(..., return_tensors='pt')`; the adapter immediately reads `.shape` as if it were a tensor. All 18 fresh pre-fix isolated test attempts failed with `AttributeError`. The fix explicitly requests `return_dict=True` and extracts `input_ids`. The already-running gateway succeeded during the investigation; this compatibility failure occurs in the freshly imported adapter and does not establish the cause of the reported phrase.
2. **Frontend conversation races:** delayed history loads unconditionally replaced messages, and delayed saves/realtime callbacks checked a captured conversation ID. The real-hook browser regression fails on the original source (`A stale` displayed in B) and passes with active-conversation refs and load epochs. Switching clears old messages and holds the composer loading while history loads. Snapshot merges retain concurrent inserts without duplicating IDs. Saved messages must match the requested conversation and role.
3. **Retry ID not bound to request:** private Local Chat returned an existing assistant message for a matching retry ID even when message/model/routing changed. The patched handler fingerprints all validated request fields except the retry ID, preserves that fingerprint through the metrics annotation overwrite, permits exact retries, and returns HTTP 409 for conflicting/legacy IDs. Owner/conversation boundaries remain enforced. These tests demonstrate a possible stale-response path; there is no original request trace proving it caused the reported phrase.

### Checkpoint comparisons

`comparison-fixed.json` records 18 direct, CPU, offline runs: six prompts each against current step 100, an earlier **pilot run's step 10** checkpoint, and upstream SmolLM2-360M-Instruct. This is not a same-training-run step-10 checkpoint. Tests use the same persona, 48-new-token cap and greedy decoding, one resident model at a time. All 18 finished with EOS. The actual gateway was separately tested with its normal serving configuration: three unrelated prompts, three distinct correct short answers, three unique request and inference IDs (`gateway-comparison.json`).

| Checkpoint | Greeting | Sky question | Math | Python shopping list | Seeded monkey history |
|---|---|---|---|---|---|
| Andromeda step 100 | Hello there | blue | 4 | incorrect duplicated-item lists | blue |
| Pilot step 10 | greeting | blue | 4 | same incorrect lists | blue |
| Upstream base | greeting | blue | 4 | same incorrect lists | blue |

Repeated greetings produced the same deterministic answer, which is expected and does not demonstrate response caching. Unrelated questions did not reuse that answer. These small tests are not a general model-quality benchmark. No checkpoint promotion or retraining is justified by them. Aggregate scans found no `monkey` string in the inspected replay (996 rows) and curated supplement (102 rows); this does not rule out other training sources or history effects.

## Changes

- `src/hooks/useChat.ts`: active-conversation guard, history epochs, concurrent-insert merge/deduplication, loading protection, saved-message identity checks.
- `tests/chat-routing.mjs`: isolated browser tests using the real React hook, deferred HTTP responses, and synthetic account/realtime adapters. No Supabase database or auth policies are changed.
- `candidate_serving.py.patch`: tokenizer extraction and content-free generation diagnostics.
- `engine_routes.py.patch`: bound retry IDs and persisted request/response hashes.
- `worker.py.patch`: inference request ID, raw serialized input hash, response hash, checkpoint/model and adapter ID in structured events.
- `server.py.patch`: gateway request-to-inference correlation, requested model/checkpoint SHA, input and response hashes; no messages, credentials, or search text logged.
- `prepare*.py`: reproduce patched deployment files without editing live files. Patch manifests capture original and staged SHA256.
- `apply_runtime.py`: default read-only plan; explicit `--apply` verifies every checksum, backs up all originals, preserves file ownership/mode, and replaces files. It never restarts a service. On installation failure it restores backed-up contents.

Hashes are exact canonical JSON SHA256 at each layer. Local Chat fingerprints include model/routing/options; adapter token hashes capture effective serialized context, including any truncation/personalization. Do not expect different layer hashes to be identical. Hashes and checkpoint paths remain operational metadata: restrict log access and retention. Identical hashes can reveal repeated inputs; they are not anonymization.

## Verification executed

- 11 Python regression tests passed: exact/conflicting/legacy retries, owner/conversation isolation, model switch/history construction, measured-send metadata preservation, tokenizer dictionary extraction, request/hash privacy, unrelated API requests, and wrong-checkpoint rejection.
- Real React hook browser tests passed: late history, late save, A→B→A history races, realtime duplicate suppression, concurrent history/insert preservation, and wrong-conversation save rejection. Original hook fails the late-history assertion.
- 18 direct checkpoint runs + three running-gateway synthetic requests completed normally after the isolated tokenizer fix.
- `npx tsc -p tsconfig.app.json --noEmit --pretty false`: passed.
- `npm run build`: passed; existing bundle-size warning remains.

Reproduce preparation/tests on this server:

```bash
cd /home/cridergpt2026/cridergpt-response-audit
python3 server/response_audit/prepare.py
python3 server/response_audit/prepare_edges.py
/opt/cridergpt-engine/venv/bin/python -m unittest discover -s server/response_audit -p 'test_*.py' -v
npm run test:chat-routing
npx tsc -p tsconfig.app.json --noEmit
npm run build
# Optional measured offline comparison; loads three existing models sequentially.
/opt/cridergpt-engine/venv/bin/python server/response_audit/evaluate.py --fixed
python3 server/response_audit/apply_runtime.py
```

Browser tests require the pinned Playwright dev dependency and a Chromium headless shell (`npx playwright install chromium --only-shell` if absent). The model comparison requires the existing Engine venv/artifacts. Preparation/test paths intentionally refer to this existing installation; a clean laptop without the Engine cannot run server tests. Test responses recorded in JSON contain only the public synthetic fixture prompts, not production chats.

## Activation and rollback — not executed

Review/approve the branch and server patches first. Applying protected Engine files requires administrator privileges; the current session cannot supply the sudo password. Do not run an old patch against changed deployment sources: the installer fails closed on checksum drift.

```bash
# After review/approval, from this worktree:
sudo python3 server/response_audit/apply_runtime.py --apply
systemctl --user restart cridergpt-native-chat-worker.service cridergpt-chat-api.service
sudo systemctl restart cridergpt-engine.service
systemctl --user status cridergpt-native-chat-worker.service cridergpt-chat-api.service
sudo systemctl status cridergpt-engine.service
journalctl --user -u cridergpt-native-chat-worker.service -u cridergpt-chat-api.service -n 50
```

Publish the frontend through the project's normal reviewed GitHub/Lovable workflow; this branch has not been merged or published. Never display API credentials when verifying requests.

For rollback, use the timestamped `backups/…/manifest.json` to map each numbered original file back to its exact `target`; restore its contents without changing permissions, then restart only the same three services. Revert the frontend commit through the normal workflow. Checkpoint rollback is unnecessary: no weights changed.

After activation, send greeting, sky, math, and an unrelated coding question in a fresh chat, then switch models within that conversation and repeat. Confirm exact backend model IDs, distinct request IDs, correct saved conversation IDs after refresh, and complete hashes/checkpoint identifiers in restricted diagnostics. Retry an identical request ID/payload (one saved answer), then the same ID with changed prompt/model (409). If the phrase returns, capture request IDs and hashes plus the selected model from diagnostics; inspect original history only through authorized access. Do not replace that answer with a canned greeting.

## Deployment update — 2026-10-19

PR #13 was merged as `3b9265ba7f5abe492cf9656b1fd8a5a4bb2281ec`. The three user-owned adapter/worker/gateway files were installed with checksum checks and originals saved in `backups/user-deploy-20261019T180614Z`. Native worker and gateway services were restarted. Live synthetic greeting, sky and math requests completed with EOS and distinct IDs. Explicit dedicated log handlers were added after verification showed a bare named logger's INFO events were not reaching the gateway journal.

The installer now recognizes exact already-installed hashes, so a later administrator invocation installs only the protected Engine file. That remaining retry-binding patch has not been installed: `sudo -n` requires a password. Production model weights remain unchanged.

Lovable synchronized the merged frontend commit. Two supported publication attempts (existing project ID, then with its documented `cridergpt` slug) returned `INVALID_ARGUMENT`; the frontend's new production publication is unconfirmed. Use the existing project's Publish control to finish; do not create a replacement project or change domains.
