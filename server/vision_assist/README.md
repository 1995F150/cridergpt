# Local vision assistance for existing text checkpoints

Proposal, not deployed. Images are analyzed by **HuggingFaceTB/SmolVLM-256M-Instruct**, revision `7e3e67edbbed1bf9888184d9df282b700a323964` (Apache-2.0). Observations are then supplied as untrusted user-turn evidence to the exact selected CriderGPT text checkpoint. Neither the selected checkpoint nor its weights are replaced. Responses explicitly label the experimental vision helper, with helper/revision/latency metadata. Text-only requests follow the original path.

## Verified environment and boundaries

Inspected server: Intel Xeon E3-1230 V2, 8 logical CPUs, approximately 16 GiB RAM. The pinned model occupies approximately 495 MiB on disk. A separate unprivileged runtime in `/home/cridergpt2026/cridergpt-vision-assist/venv` reuses installed Engine Python libraries read-only through a `.pth` path, adding Pillow and CPU torchvision 0.27.1 locally to match existing CPU torch 2.12.1. Engine packages were not changed. Model generation is CPU-only, two Torch threads, image splitting disabled, longest edge 512, at most 64 output tokens and a subprocess timeout of 75 seconds. This first implementation loads the helper per image rather than keeping another model resident. The gateway's existing one-generation lock bounds concurrency.

A real logo-image smoke test produced a recognizable logo description in about 10 seconds. This is a smoke test, not an accuracy benchmark. The small helper can hallucinate, truncate observations, miss text and details, and does not provide reliable measurements, identity verification or mechanical/medical diagnoses. The upstream model emits a pad-token configuration warning under the installed Transformers version; useful output was observed, but broader compatibility/quality evaluation remains required. No training was performed.

## Input and privacy

One PNG, JPEG or WebP image at a time, at most 3 MiB decoded and 8 megapixels; animations rejected. Image questions are limited to 500 characters to preserve space for observations on small checkpoints. No image URLs are fetched by the helper: clients submit bytes, blocking an image-fetch SSRF path. PIL validates/decodes input before inference and metadata is not retained in the helper image. Arbitrary model/repository names and remote model code are not accepted. Images and helper prompts are not logged or added to training datasets. Retrieved/recognized instructions are evidence only, never promoted to system messages; this boundary does not prove a small model is immune to prompt injection.

Public website uploads retain its existing authorized Storage behavior for user history. Local Chat's staged upload does not store original image bytes; it saves the final labeled response/metadata. This implementation does not add iOS PhotosPicker support or change the independent iOS parity PR.

## Changes and validation

- `worker.py`: local offline image recognition; isolated model/dependencies already downloaded on this server.
- `bridge.py`: exact selected text-model continuation with labeled vision provenance.
- `prepare_gateway.py`: generated/ignored patch for the existing public API, same auth and `/v1/chat`; optional `image_base64`, capability advertisement, bounded body size and diagnostics.
- `prepare_local.py`: generated/ignored patch for protected Engine Local Chat, native-only upload and retry IDs bound to the image.
- Existing Supabase native adapter and public chat: forward explicit image bytes only when server advertises capability. No silent cloud provider or replacement checkpoint.

Tests: eight helper validation/provenance tests, three staged gateway HTTP integration tests, eight existing gateway regressions, and twelve native Edge adapter tests. Stage generation does not install code. Commands from repo root:

```bash
python3 server/vision_assist/prepare_gateway.py
python3 server/vision_assist/prepare_local.py
/home/cridergpt2026/cridergpt-vision-assist/venv/bin/python server/vision_assist/test_bridge.py
/home/cridergpt2026/cridergpt-vision-assist/venv/bin/python server/vision_assist/test_gateway.py
/home/cridergpt2026/cridergpt-vision-assist/venv/bin/python server/vision_assist/test_existing_api.py
node --test tests/native-chat/native-api.test.mjs
npm run build
```

## Deployment, review and rollback

Production deployment is separate from preparation/testing. Obtain approval before restarts or publishing. Check there are no outstanding image-generation jobs before a gateway restart; those jobs currently live in gateway memory.

`python3 server/vision_assist/install.py` displays the plan. After approval, `--apply` installs the isolated helper code and updates/restarts only the public API user service, with source hashes, backup, health probe and rollback. The existing API keys are preserved. Authenticated `/v1/models` must advertise `vision_assist_supported`; POST `/v1/chat` with the existing model/messages plus `image_base64` to verify it. Test ordinary text too. This does not expose a new public port or alter firewall/DNS.

`python3 server/vision_assist/install_local.py` displays the protected Engine plan. Applying it requires root access, the installed helper and a separate approved Engine restart; the current session cannot modify those protected files. Verify both image and text requests after installation. The Local Chat installer currently verifies systemd restart success, not a full authenticated post-restart health check; perform that check before declaring activation complete.

Review/merge the public UI and deploy the changed `chat-with-ai` Edge Function to activate its bundled native adapter. Until then, live public native image requests remain rejected. Images cannot be supported by publishing the frontend alone. No cloud credentials/environment values need to move into the browser.

Rollback: restore only the backed-up gateway/Engine source files and restart only the affected service. Keep existing keys/checkpoints/history/databases intact. The new helper code, venv and downloaded model are separate and may be removed only after no configured caller depends on them. Do not apply this patch blindly over the independent history-sync PR #7: both patch the gateway/Local Chat and must be regenerated and jointly reviewed against the final installed source.
