# Agent-understanding instruction dataset specification — v1

This is a specification and a small original candidate set, **not** an approved production training corpus. No training starts in Phase 1. New examples are authored for this task; no web crawl, third-party licensed dataset, private chat log, memory entry, credentials or customer task output is imported. Rights and human-quality review remain required before candidate rows can enter training.

## Target behavior

The model should distinguish intent from wording, identify an achievable outcome, preserve constraints/preferences, expose blocking missing information, propose capabilities without claiming availability, decompose work into ordered dependent steps and state task-specific verification/success criteria. It should plan rather than act, avoid fabricated tool results, clarify material ambiguity, refuse genuinely harmful requests and avoid refusing benign sensitive tasks merely because they mention backups or credentials.

Use the exact `TaskPlan` contract exported from `server/planning/core.py`; `schema.json` is a generated review artifact, not a second manually maintained contract. Assistant responses contain one complete JSON object. Capability names are symbolic proposals. There are no tool calls, tool messages, executable command payloads or fictional execution transcripts. Provide concise plan rationales, not hidden chain-of-thought traces.

## Proposed reviewed corpus

Before a pilot, target approximately 2,000 training, 250 validation and 250 independently authored test records, subject to measured token-length/cost calibration. These are proposed counts, not collected data. Balance interpretation/decomposition, ambiguity/clarification, constraints/preferences, tool selection, dependencies, verification, malicious task-data instructions, harmful refusal and benign-sensitive contrasts. Include both short and longer tasks; do not let repeated schema boilerplate dominate useful task content.

Each row must contain:

- Stable ID, scenario-family ID, category and split.
- Original source/provenance, ownership/license identifier, rights-review evidence, reviewer ID and quality-review status.
- User task and optional explicit constraints/preferences using the input contract.
- Assistant plan matching the output contract, with a second independent review of correctness, dependencies and criteria.
- Labeling notes explaining ambiguity or disposition; avoid unverified personal facts or live provider details.

Allowed sources: original project-owned tasks with documented rights, explicit licensed contributions, or reviewed permissively licensed sources with attribution and redistribution obligations recorded. Missing/unknown rights fail eligibility. Candidate metadata must say AI-authored where applicable; synthetic output is never automatically marked human-reviewed or correct. Existing public or private model output is not a gold label without review.

## Splits and contamination

Split by scenario family and source/document/authoring session **before** paraphrasing or generating variants. Keep near-duplicate templates, variable substitutions, follow-up turns and related task variants in one split. Maintain normalized task/answer hashes, near-duplicate word/shingle checks, source-family membership and split manifests. Do not treat exact-string disjointness as proof of independence.

`benchmark.json` is an evaluation-only development screen and is excluded from seed training. Do not feed its tasks, answers, failed outputs or close paraphrases into a later optimizer and continue calling that score held-out. Once examples become development feedback, create a separately versioned blind holdout for release decisions. The included validator checks contract, exact/near task overlap and rights/review gates; it cannot certify semantic independence or provenance truth automatically.

## Tokenizer and training preparation

Use each checkpoint's actual tokenizer/chat template; verify special token IDs and vocabulary/embedding compatibility. Build labels only for the assistant JSON and its end marker, checking full-prefix token boundaries. Mask user/system text and padding. Reject examples that exceed the calibrated context rather than truncating a JSON plan or dropping constraints. Keep all turns of a related scenario together. Preserve supplied constraints/preferences verbatim; task-embedded constraints still require semantic review.

Record token-length quantiles with the inspected tokenizer before choosing a sequence length. Start by comparing 512/1,024 against the current 1,280-token development budget; the model config's 8,192 positions do not authorize increasing production context. Full training on the current 256-token curriculum would discard or truncate many detailed plans, so use measured acceptance rates rather than blindly reusing that pipeline.

After sufficient reviewed data exists, a separate SFT proposal should compare an unchanged base, existing step 100 and a small LoRA candidate with identical held-out prompts. Reuse assistant-only labels, fixed seeds, clipping, accumulation, held-out loss, bounded learning-rate schedule, periodic immutable adapter/optimizer saves and regression checks. Select adapter rank/targets only after model compatibility and a forward/backward calibration. Measure RAM, disk, step time and wall-clock budget before approving any run. No cost/duration estimate or quality gain is claimed before that calibration.

## Acceptance and exclusions

An eligible training record passes JSON/graph checks, review of intent and constraints, capability appropriateness, justified clarification/refusal, non-fabrication, task-specific success criteria, rights and privacy checks. A seed set with unreviewed rows remains ineligible even if every row passes a JSON schema. Require paired benign/harmful examples and adversarial missing-information tests to measure over-refusal and under-refusal. Never use refusals as a substitute for understanding ordinary requests.

The current seeds deliberately have `reviewed: false`, `rights_reviewed: false` and are not training-ready. They illustrate the format, not a claimed high-quality completed corpus. Runtime model failures remain evaluation evidence and are not copied into the seed answers.
