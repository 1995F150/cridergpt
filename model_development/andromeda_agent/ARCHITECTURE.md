# Phase 1 architecture assessment

Inspected on 2026-10-19/20. This branch adds an isolated development planner; no production routing, checkpoint registry, chat toggle, tool queue, service or model weights is changed.

## Existing application paths

- React/TypeScript/Vite frontend. `src/components/chat/ChatInput.tsx` implements the Agent toggle by prefixing `[AGENT_MODE]` to a normal message. That is not a structured planner or an execution boundary.
- `src/pages/devhub/AgentDispatcher.tsx` invokes `swarm-orchestrator`, with a separate `agi-chat` fallback. `AgentSwarmPanel.tsx` provides role/session orchestration. These are distinct from a verified local Andromeda planning contract.
- `supabase/functions/chat-with-ai/index.ts` contains cloud tool definitions and handlers including PC task-queue actions. Native IDs take the earlier authenticated native route. The new planner does not import this function, product tool definitions, swarm handlers, PC agent or queue clients.
- Native chat runs through the existing authenticated API at `127.0.0.1:8772`, a loopback inference worker at `127.0.0.1:8770`, `SelectorRuntime`, and `CandidateServing`. Ordinary routing may use persona/personalization logic, web retrieval and vision helpers; none of those is used in the isolated planning comparison.

## Models and serialization

- The inspected API and candidate registries identify `andromeda-3.0-360m-100`. Its checkpoint config is `LlamaForCausalLM`, hidden size 960, 32 layers, vocabulary 49,152 and configured maximum positions 8,192. It derives from the locally pinned SmolLM2-360M-Instruct base, not a model pretrained from scratch in this task.
- The tokenizer config calls the tokenizer GPT2Tokenizer; that does **not** mean the model has GPT-2 architecture. The saved `chat_template.jinja` is loaded by `AutoTokenizer` although `tokenizer_config.json` has no inline template. BOS/EOS/pad are checked against the loaded artifacts in the benchmark; generation-config EOS/pad are ID 2.
- `CandidateServing` uses the tokenizer's chat template for pretrained checkpoints and a separate custom serializer for native GPT-2-family checkpoints. Current candidate inference caps output at 256 tokens, uses a bounded generation time, rejects context overflow or recovers limited history explicitly, and uses a configured Andromeda serving context budget of 1,280. The config's 8,192 positions are not evidence that training or serving has been validated at that length.
- Earlier full-weight pilot: `cridergpt-3.0-andromeda-pilot-20261012-134203/checkpoint-pilot`, ten updates, report context 512. Step 100 continues from that pilot with a reported 80/20 prepared-replay/correction mix and 100 updates. The reports and checkpoints are preserved.
- A later curriculum LoRA `adapter-step-20` exists. Its existing report says it did not improve the measured task gate and was not deployed. The current isolated speech/ML runtime does not include PEFT, so this task does not silently install or merge the adapter. A separate 1.7B five-step LoRA pilot also exists; it requires its own memory/runtime budget and is not interchangeable with the 360M full weights.
- No verified Andromeda 3.2 checkpoint/report/registry entry was found in the inspected Engine, API, model-transfer and related project directories. Some historical backup paths are not readable. `checkpoints.json` records 3.2 as unavailable rather than inventing or renaming an artifact. Add its verified path/checksums before comparing it with the same benchmark.

## Training observations

The existing pilot/training-improvement scripts have offline model loading, safe checkpoint saves, fixed seeds, gradient clipping and assistant-only label masking in applicable paths. Some old native serialization helpers left-truncate examples; the newer curriculum preparation rejects oversized rows and checks assistant-token boundaries. These practices differ across scripts and must not be assumed consistent. Existing training provenance manifests are evidence of preparation, not proof of licensing or factual correctness for every row. Private chat logs/memory are not imported here.

The proposed agent dataset uses complete assistant JSON targets, explicit EOS and tokenizer-prefix boundary checks. It rejects over-context examples rather than truncating plans. Its benchmark is separately frozen and excluded from training. No training script is started or changed in this phase.

## Implemented boundary

`server/planning/core.py` is a pure interpretation/validation interface. A trusted local model callable receives a bounded ChatML task, with literal role markers escaped. It can return a proposed plan or an explicit invalid/incomplete result. It has no tool registry, action dispatch, file/network client, subprocess launch, retries, retrieval, persistence or execution endpoint. Capability names are descriptive enums, not callable permissions. This is not a sandbox for arbitrary Python callbacks: only the provided trusted offline adapter should be supplied.

The operator CLI reads a request from stdin, loads an explicitly pinned local full-weight checkpoint, and prints the validated result. It never connects to the production API or external inference. The evaluation harness is separate: it intentionally writes new synthetic benchmark reports, while the planner does not write conversations or files. The CLI is not mounted onto public chat and no new HTTP listener is opened.

Pydantic enforces strict types, forbidden extra fields, bounded collections, status consistency, sequential step IDs, declared capabilities and backward-only dependency references. Duplicate JSON keys, NaN, Markdown-wrapped output, repeated steps, omitted explicit constraints/preferences and interrupted generation fail closed. A conservative textual guard flags some fabricated execution claims. These checks do not establish factual truth, safe content, complete task understanding or agent readiness; every accepted plan remains marked for semantic review.

## Host and evaluation isolation

Inspected Xeon E3-1230 V2, eight logical CPUs, approximately 16 GiB RAM and RX 580 2048SP. Evaluation uses existing CPU Torch/Transformers/Pydantic packages in the independent voice runtime; no packages are installed or updated. The transient evaluation service uses CPUQuota=100%, MemoryMax=4G, no swap, low priority, a private network namespace, read-only home/system and write access only to a new evaluation directory. No GPU acceleration or training capability is assumed. Existing chat, image, vision and voice services remain running.
