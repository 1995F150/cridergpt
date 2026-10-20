# Andromeda Agent Intelligence — Phase 1

Implemented preparation only: strict task-plan contract, pure planning interface, pinned offline CLI, original dataset specification/candidates, token/rights/overlap checks, fixed checkpoint benchmark and regression tests. **No executor, autonomous tools, training, checkpoint replacement, public endpoint or production behavior change.** Existing Agent Mode/swarm/PC paths remain separate and untouched.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [DATASET_SPEC.md](DATASET_SPEC.md) and [RESULTS.md](RESULTS.md). The two tested full-weight Andromeda checkpoints each produced **0/12 validated plans**, despite normal EOS on every case. They are not agent-ready. No verified 3.2 artifact was found; its absence and the untested adapters are recorded in `checkpoints.json`.

## Planning interface

From the repository root, using the already installed private Python runtime:

```bash
PLANNING_PY=/home/cridergpt2026/cridergpt-voice/venv/bin/python
PYTHONDONTWRITEBYTECODE=1 "$PLANNING_PY" -m server.planning.cli \
  --model andromeda-3.0-360m-100 <<'JSON'
{"task":"Plan reviewing a small repository without changing files.","constraints":["No execution."],"preferences":[]}
JSON
```

It reads JSON from stdin and prints either a validated proposed plan or a visible invalid/incomplete/unavailable result. Exit 0 means the structural contract passed, **not** that the plan is correct; exit 2 means no plan was accepted. With the tested checkpoint, expect explicit rejection rather than a fabricated template answer. It reads only local model artifacts and does not persist the request/output itself. Do not pipe production secrets into development diagnostics.

The pure in-process interface is `Planner(trusted_local_generator).plan(request)` in `server/planning/core.py`. The generator receives bounded system/user messages and returns text plus actual termination metadata. The supplied `OfflineModel` performs no retrieval/network/model downloading. It is trusted application code, not an arbitrary callback sandbox. User JSON cannot supply tools or substitute the generator. `TaskPlan.model_json_schema()` produces the committed `schema.json`; there is no manually maintained second schema.

Validated plans include intent/outcome, constraints/preferences, missing-information questions, proposed capabilities, ordered steps with backward dependencies, success criteria, assumptions and refusal disposition. Results always have `execution_enabled: false`, `agent_ready: false` and `semantic_review_required: true`. Invalid JSON, unknown keys/tools, graph errors, omitted explicit constraints, repeated steps and incomplete generation fail closed. No generated code is executed, and no model output is treated as a tool result.

## Regression and data checks

```bash
PYTHONDONTWRITEBYTECODE=1 "$PLANNING_PY" -m unittest \
  server.planning.test_core model_development.andromeda_agent.test_dataset \
  model_development.andromeda_agent.test_benchmark -v
PYTHONDONTWRITEBYTECODE=1 "$PLANNING_PY" -m model_development.andromeda_agent.dataset
```

Pydantic 2.11.7 is pinned in `server/planning/requirements.txt` and was already installed. No dependency was installed/upgraded. `encoding.py` provides explicit dictionary token extraction, assistant-only masking, EOS preservation and no-truncation gates; it neither trains nor exports an approved corpus. The six original candidate rows remain unreviewed and rights-review pending, so the audit returns zero eligible training examples. They must not be treated as a completed high-quality training set.

## Reproduce the fixed benchmark

Use a **new** output path for each run; existing reports/checkpoints are never overwritten. The original run used a single transient service for both sequential comparisons, one core equivalent, 4 GiB memory, no swap, low priority, private network and read-only home/system. Only the new evaluation directory was writable. Per-task generation limit was 40 seconds / 256 new tokens. No training run was authorized or started.

```bash
# Ensure the parent report directory exists privately before using it.
systemd-run --user --unit=cridergpt-plan-eval-new --collect --wait --pipe \
  --working-directory="$PWD" -p CPUQuota=100% -p MemoryMax=4G \
  -p MemorySwapMax=0 -p TasksMax=32 -p Nice=10 -p NoNewPrivileges=true \
  -p PrivateNetwork=true -p ProtectSystem=strict -p ProtectHome=read-only \
  -p ReadWritePaths=/private/planning-reports -p RuntimeMaxSec=900 \
  "$PLANNING_PY" -B model_development/andromeda_agent/evaluate.py \
  --model andromeda-3.0-360m-100 --output /private/planning-reports/new-step-100
# Repeat separately with --model andromeda-3.0-pilot-10 and a new output path/unit.
```

Reports preserve raw **synthetic** outputs, source/benchmark pins, tokenizer IDs, model/checkpoint hashes, finish reasons, timing, repetition/claim indicators and heuristic rubric failures. `results/cli-smoke.json` records the separate actual CLI rejection test. The benchmark repeats one task intentionally to test request isolation; identical greedy answers to that repeated task are not a cache bug. No benchmark prompt is used for training.

## Limits and promotion

The semantic rubric is a small development heuristic, not an independent human/safety assessment. Schema-valid plans can still misunderstand goals or propose unsafe/inappropriate actions. The content guard recognizes only some fabricated-result phrases. Model config context length is not validated deployment capacity. No 3.2 claims, license completeness, new quality scores, training gains or execution capabilities are inferred from schema compliance. See the measured weaknesses, proposed next SFT/data milestone and controlled-execution roadmap in `RESULTS.md`.

There is nothing to restart or deploy for Phase 1. CLI/tests are opt-in; no service was installed and no existing frontend Agent toggle was wired to this development planner. A later application integration requires explicit approval and authenticated owner-scoped request handling separate from any execution interface.

Final verification: **24 automated tests passed**, including prohibited side-effect calls, strict/graph/status validation, repeated-step rejection, claim detection, no fallback, context rejection, assistant/EOS masking, review/rights/contamination gates and raw benchmark/source integrity. The separate actual CLI smoke intentionally exited 2 with an invalid-plan result. All existing application services remained active. No production build is required because Phase 1 does not modify frontend or runtime application routes.
