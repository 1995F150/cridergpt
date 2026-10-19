# CriderGPT Pulsar — development foundation

Pulsar is the proposed fast-chat model line. Candidate `pulsar-1.0-135m-candidate1` is at **base evaluation**, not a trained/released Pulsar. No production model registry, public selector, inference service, credentials, checkpoint or training dataset was replaced. No fine-tuning or optimizer steps have been run.

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

99 newly authored, **review-only** examples: 82 training and 17 validation, covering conversation, uncertainty, factual questions, format/JSON adherence, arithmetic, Python literals/functions and multi-turn references. No private logs, stored conversations, screenshots, customer data, image bytes or held-out evaluation prompts were imported. Project-owner review is still required; no redistribution license was assigned to the user's data.

`prepare_data.py` rejects malformed turns, duplicate examples across splits, exact normalized evaluation-prompt overlap and known irrelevant response targets. `plan.py` validates file/model hashes and tokenizer template alignment, masks every prompt token with -100, preserves the assistant end token and rejects oversize examples instead of silently truncating them. Verified examples are 41–68 tokens. A seed of this size is for pipeline feasibility; it is insufficient evidence of comprehensive conversational competence or safety. Near-duplicate/semantic contamination and a larger independently reviewed corpus need further work.

## Pilot proposal — not launched

`training-plan.json` proposes a **10-optimizer-step feasibility pilot**, LoRA rank 8 on `q_proj` and `v_proj`, 460,800 estimated trainable parameters, learning rate 1e-4, microbatch 1, accumulation 4, sequence limit 256, clipping 1.0 and seed 611. The source base would stay frozen and adapters/checkpoints must be saved to a new timestamped directory, never over an existing model.

Planning estimate: **2–4 GiB process RAM**, at most 256 MiB extra checkpoint/optimizer disk budget, and **2–15 minutes** on two CPU threads. This duration is uncalibrated, not inferred as a reliable training benchmark from decoding speed. A first forward/backward microbatch must calibrate it before a run. Bound training to 900 seconds and leave all previous weights intact. No paid API or external training service is required; local electricity cost is not estimated.

No trainer is automatically invoked by this package. The next work is to review/expand the seed set, calibrate the pilot, adapt the existing LoRA pipeline to this pinned 135M model (the installed trainer contains 1.7B-specific assumptions), then compare the resulting adapters against the same baseline and a fresh, disjoint evaluation set. A pipeline-feasibility pilot must not be sold as a quality improvement. If the 135M candidate cannot reach the quality floor, retain a larger base or abandon the smaller candidate.

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

Validation executed: 11 foundation tests passed; all 99 examples passed tokenization/masking and split checks; 18 isolated generation cases completed; source weight SHA values were rechecked. The running chat, native worker and vision helper remained active. No frontend, database, inference API, URL, naming schedule or model deployment was changed.
