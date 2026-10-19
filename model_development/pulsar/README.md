# CriderGPT Pulsar — development foundation

Pulsar is the proposed fast-chat model line. Candidate `pulsar-1.0-135m-candidate1` is at **base evaluation**, not a trained/released Pulsar. No production model registry, public selector, inference service, credentials or existing checkpoint was replaced. The original foundation baseline below is retained. Two subsequent isolated **50-step LoRA pilots have now run**, saved separately; see the follow-up results below. It is not released.

## Inspected foundation

- Base: [HuggingFaceTB/SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct), pinned revision `12fd25f77366fa6b3b4b768ec3050bf629380bac`; model card states Apache-2.0. The unmodified upstream model already has instruction training; it has not been fine-tuned for Pulsar.
- Verified parameters: **134,515,008**. Actual downloaded safetensors size: 269,060,552 bytes, SHA256 `5af571cbf074e6d21a03528d2330792e532ca608f24ac70a143f6b369968ab8c`.
- Llama architecture and 8192 upstream position limit are recorded in `base-manifest.json`; only a **512-token serving/evaluation budget** is used here. Long-context quality has not been validated.
- Host: Xeon E3-1230 V2, 8 logical CPUs, approximately 16 GiB RAM. CPU flags include AVX but not AVX2; no AVX2-dependent quantization backend was assumed. GPU image generation remains independent. Existing Python environments were reused without package changes.
- This is a candidate comparison and seed-data package. It does not claim that selecting a new name or preparing examples improves model weights.

## Measured baseline — 2026-10-19

Each model loaded separately, CPU float32/eager, two Torch threads, greedy decoding, warmup excluded, maximum 64 new tokens, 15-second per-generation time limit. Both were run under one low-priority systemd scope capped to **100% CPU** (one core-equivalent), 4 GiB RAM and no swap. These are not production API latency measurements; production serving has a different prompt and CPU allowance.

| Recorded metric | Unmodified 135M candidate base | Existing Andromeda step 100 |
|---|---:|---:|
| Parameters | 134,515,008 | 361,821,120 |
| Median total tokens/second | 6.237 | 2.619 |
| Median response seconds | 1.7963 | 3.1631 |
| Median first-token seconds | 0.6039 | 1.5757 |
| Peak process RSS MiB | 1131.2 | 1770.5 |
| Heuristic smoke checks passed | 5/9 | 5/9 |

Median throughput ratio: **2.381×**. This is a small, single-sample comparison with different generated answer lengths, not a controlled equal-token throughput benchmark or evidence of broad intelligence. Complete prompts, outputs, finish reasons, prompt/response hashes, timing and model SHA are in `baseline-base.json` and `baseline-comparison.json`.

Observed candidate failures:

- `8 + 9 = 17` computes the correct value but violates “only the number.”
- The requested two-line output became one line.
- JSON included extra explanation/keys.
- The model invented a fictional game origin instead of admitting that the creator's birthday was unknown.

The birthday grader was tightened after reviewing Andromeda's answer “CriderGPT's creator is unknown,” which does not answer the requested birthday and is not an acceptable verified assertion. Stored outputs were regraded; timing and generated text were not changed. This review is documented in both records. These outputs must never be imported as training answers.

`comparison.json` explicitly reports that the speed target passes and the quality target fails. Candidate release requires at least 85% on this smoke suite, no more than a five-point regression against the comparator, further independent/expanded evaluation, request-isolation tests through the final serving pipeline, and human review. Passing nine synthetic cases alone would still not justify production claims.

## Seed data and validation

99 newly authored, **review-only** examples: 82 training and 17 validation, covering conversation, uncertainty, factual questions, format/JSON adherence, arithmetic, Python literals/functions and multi-turn references. No private logs, stored conversations, screenshots, customer data, image bytes or held-out evaluation prompts were imported. Project-owner review is still required before release or broader dataset use; the later user-authorized bounded synthetic-data pilot is documented below. No redistribution license was assigned to the user's data.

`prepare_data.py` rejects malformed turns, duplicate examples across splits, exact normalized evaluation-prompt overlap and known irrelevant response targets. `plan.py` validates file/model hashes and tokenizer template alignment, masks every prompt token with -100, preserves the assistant end token and rejects oversize examples instead of silently truncating them. Verified examples are 41–68 tokens. A seed of this size is for pipeline feasibility; it is insufficient evidence of comprehensive conversational competence or safety. Near-duplicate/semantic contamination and a larger independently reviewed corpus need further work.

## Original pilot proposal — historical foundation plan

`training-plan.json` proposes a **10-optimizer-step feasibility pilot**, LoRA rank 8 on `q_proj` and `v_proj`, 460,800 estimated trainable parameters, learning rate 1e-4, microbatch 1, accumulation 4, sequence limit 256, clipping 1.0 and seed 611. The source base would stay frozen and adapters/checkpoints must be saved to a new timestamped directory, never over an existing model.

Planning estimate: **2–4 GiB process RAM**, at most 256 MiB extra checkpoint/optimizer disk budget, and **2–15 minutes** on two CPU threads. This duration is uncalibrated, not inferred as a reliable training benchmark from decoding speed. A first forward/backward microbatch must calibrate it before a run. Bound training to 900 seconds and leave all previous weights intact. No paid API or external training service is required; local electricity cost is not estimated.

At the original foundation stage, no trainer was invoked. The later explicit pilot is recorded below; there is still no automatic training or deployment. The next work is to review/expand the seed set, calibrate the pilot, adapt the existing LoRA pipeline to this pinned 135M model (the installed trainer contains 1.7B-specific assumptions), then compare the resulting adapters against the same baseline and a fresh, disjoint evaluation set. A pipeline-feasibility pilot must not be sold as a quality improvement. If the 135M candidate cannot reach the quality floor, retain a larger base or abandon the smaller candidate.

## Reproduce

From this repository on the existing server:

```bash
/opt/cridergpt-engine/venv/bin/python model_development/pulsar/fetch_base.py
python3 model_development/pulsar/prepare_data.py
python3 -m unittest discover -s model_development/pulsar -p 'test_*.py' -v
/opt/cridergpt-engine/venv/bin/python model_development/pulsar/plan.py
systemd-run --user --scope -p CPUQuota=100% -p MemoryMax=4G -p MemorySwapMax=0 \
  nice -n 10 /bin/bash -c '/opt/cridergpt-engine/venv/bin/python model_development/pulsar/benchmark.py --model base && /opt/cridergpt-engine/venv/bin/python model_development/pulsar/benchmark.py --model comparison'
python3 model_development/pulsar/summarize.py
```

The public base download uses the pinned commit with `token=False`, no new API key. Benchmarking and validation thereafter are offline. `fetch_base.py` refuses a differing existing weight file. Reports refer to this installation's paths; a different host must update paths in a separate configuration and keep checksum verification.

Foundation-stage validation: 11 foundation tests passed; all 99 examples passed tokenization/masking and split checks; 18 isolated generation cases completed; source weight SHA values were rechecked. The running chat, native worker and vision helper remained active. No frontend, database, inference API, URL, naming schedule or model deployment was changed.

## Follow-up: bounded fine-tuning and call audit

The user requested 9/9 and an investigation into server-hosted call mode. A 50-step adapter pilot used only the existing synthetic seed set, after agent review recorded in `dataset-review.json`. This is not human approval for production. Its proposed 50-step estimate was calibrated at 2.31 seconds for the longest forward/backward microbatch, projecting approximately 694 seconds with a conservative multiplier, within the 900-second training budget. The process ran with CPUQuota=100%, MemoryMax=4G, no swap, two Torch threads and low scheduling priority. No paid API was used.

Actual training: **50 optimizer updates, accumulation 4, 381.69 seconds**, 460,800 trainable adapter parameters; five separate adapter/optimizer snapshots (steps 10/20/30/40/50), with the base weight checksum unchanged. Validation loss fell from **1.6773 to 1.0370** on a tiny template-related validation set. This is evidence of fitting this seed data, not broad competence. Full trace and actual responses: `pilot-results.json`. Binary adapters stay in ignored private `runs/`, not Git.

The original nine development checks improved **5/9 → 6/9** in the same training-compatible runtime: JSON became correct; the Python literal became simpler; number-only and two-line output still failed, and creator uncertainty was still incorrect. This comparison uses Torch 2.5.1, Transformers 4.57.6 and PEFT 0.17.1, rather than the foundation serving environment's Torch 2.12.1/Transformers 5.13.0. Both controls were rerun in the same runtime; do not mix timings across runtimes or claim the base serving benchmark is the adapter's measured throughput.

`fresh_cases.json` adds 12 exact-prompt-disjoint checks, never used by the optimizer. `fresh-results.json` records **1/12 base → 2/12 adapter** automatically. `fresh-review.json` identifies one valid uncertainty answer missed by the fixed lexical grader, giving a manual assessment of 3/12 for the adapter while preserving the automatic score. The remaining failures include arithmetic, exact formatting, conversation recall and fabricated creator identity. **This candidate is rejected for release.** The requested 9/9 has not been achieved by this pilot.

`instruction-policy.txt` is a separate development experiment: a compact general formatting policy with owner-provided creator attribution and no birthday asserted. It contains no evaluation answers or example completions. The base and adapter are evaluated with the same policy, with the changed system prompt recorded. The policy experiment recorded **6/9 for both base and first adapter** (`policy-results.json`): uncertainty improved, but JSON regressed. It did not meet the requested target. Policy results must be described separately from weight improvements. All nine prompts are now development diagnostics, not a blind final test. Even 9/9 would require independent broader evaluation before release.

The practical next model step is a more varied, independently reviewed instruction corpus and a stronger base comparison, not endless training on these nine checks. A second separately capped diversity pilot is documented below; no unbounded or production training is queued. All original checkpoints and production inference remain intact.

Explicit reproduction (no automatic training; development environment only):

```bash
TRAIN_PY=/home/cridergpt2026/cridergpt-engine-verified/.venv-inference-compat/bin/python
systemd-run --user --scope -p CPUQuota=100% -p MemoryMax=4G -p MemorySwapMax=0 \
  nice -n 10 "$TRAIN_PY" model_development/pulsar/experiment.py --calibrate --steps 50
# A deliberate training command creates a new directory; never replaces earlier adapters:
systemd-run --user --scope -p CPUQuota=100% -p MemoryMax=4G -p MemorySwapMax=0 \
  nice -n 10 timeout 1500 "$TRAIN_PY" model_development/pulsar/experiment.py --train --steps 50
# Supply a saved adapter and a NEW output path to avoid overwriting prior evidence:
"$TRAIN_PY" model_development/pulsar/evaluate_adapter.py --adapter /private/adapter-step-50 --output /private/new-results.json
```

Call-mode findings, source fixes, consent-reference tooling, hardware constraints and the staged local speech architecture are documented in [`server/voice/README.md`](../../server/voice/README.md). Existing call STT/TTS still require external providers until an actual local worker is implemented, benchmarked and explicitly activated. No existing voice reference was enrolled or cloned.

## Diversity follow-up pilot

`prepare_varied_data.py` preserves the first seed set and adds varied single-word/two-line, arithmetic notation, JSON-key, uncertainty, identity and Python references in `varied-seed-v2/`: **273 total examples (256 train, 17 validation)**. Original, fresh and final exact prompts are excluded by validation. These remain synthetic templates, including narrow arithmetic patterns, not a substitute for a real diverse corpus. The existing diagnostic failures informed the data design; this is development work, not blind testing.

A second separately calibrated **50-step** pilot warm-started the first adapter's weights with a fresh AdamW optimizer, learning rate 3e-4 and the same rank, gradient clipping, accumulation and resource caps. Calibration projected about 685 seconds (recorded separately in `calibration-varied.json`); training took **376.79 seconds**. The first adapter, original model files and all ten saved adapter snapshots remain intact. Validation loss fell **1.0370 → 0.5593**. Original smoke checks improved **6/9 → 7/9**; number-only output became correct, while the two-line request and creator uncertainty still failed. Evidence: `varied-pilot-results.json`. This is 100 total optimizer updates across two separate pilots, not a from-scratch pretrained model.

The separately frozen `final_checks.json` (SHA256 `7c09e3745b60f253c22b8f6fb7f04836ce2e291572238038deb73cc2209694f9`) records **2/12 base → 6/12 final adapter** with the neutral prompt (`final-results.json`). A manually reviewed evidence-unavailable answer may raise the latter to 7/12 (`final-review.json`); the original automated score is preserved. Arithmetic is still wrong on new numbers, a Python list substitutes an item, creator identity is incorrect, and the model says Pluto is the largest planet. This blocks release regardless of the nine-case development score.

The already-written instruction policy is also checked against both the original nine and frozen final twelve in `policy_validation_cases.json`; it has not been changed in response to the second pilot. That report is distinct from neutral-policy weight comparisons. There is no automatic model registration, deployment, paid inference or further queued training.

### Final verdict

**The requested 9/9 was not achieved.** Final adapter: **7/9** completed original checks with either neutral or the prewritten instruction policy. Under the policy, the final set reports 5/12 lexical content passes but **only 4/12 complete passes**: Spanish translation repeats “Hola” until the token limit, which the original contains-word grader counts despite interruption. No raw score/output was rewritten; the separate candidate verdict records completion as a mandatory gate. The neutral final set remains 6/12 completed passes. The known-largest-planet answer regressed from Jupiter to Pluto after training. These are model-quality failures in direct offline inference, not evidence of a website transport truncation bug.

`varied-pilot-candidate.json` rejects release and records both content and completion outcomes. No failed evaluation was converted into a canned serving answer, no test prompt was added to training, no grader was weakened, no model was promoted, and no further training is queued. A larger/more varied reviewed corpus and a stronger base comparison are justified; repeating this tiny template exercise until a desired score appears would not establish a useful assistant.

Software verification: 15 model-data/foundation tests; 4 private voice-reference tests; 11 call-turn checks plus real React-hook/browser lifecycle checks and mocked Edge authentication tests; existing chat-routing checks; application TypeScript check, scoped call-source ESLint, and production Vite build all passed. Vite retains its large-bundle warning. Mocked microphone/provider tests do not verify real speech quality or phone audio permissions. No live provider call, speech-model install, voice enrollment/cloning, database migration, service restart, deployment or merge was performed.
