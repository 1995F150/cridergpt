# Local vision assistance for existing text checkpoints

Implementation integrated into the current main-based worktree; activation state is recorded below. Images are analyzed by **HuggingFaceTB/SmolVLM-256M-Instruct**, revision `7e3e67edbbed1bf9888184d9df282b700a323964` (Apache-2.0). Observations are then supplied as untrusted user-turn evidence to the exact selected CriderGPT text checkpoint. Neither the selected checkpoint nor its weights are replaced. The development bridge now says “Image analyzed with CriderGPT (local vision assistance)” in the visible answer; actual helper/revision/latency remain in diagnostics. This wording change is not yet activated in existing gateway processes. The helper remains experimental; branding does not mean the text checkpoint itself gained vision. Text-only requests follow the original path.

## Verified environment and boundaries

Inspected server: Intel Xeon E3-1230 V2, 8 logical CPUs, approximately 16 GiB RAM. The pinned model occupies approximately 495 MiB on disk. A separate unprivileged runtime in `/home/cridergpt2026/cridergpt-vision-assist/venv` reuses installed Engine Python libraries read-only through a `.pth` path, adding Pillow and CPU torchvision 0.27.1 locally to match existing CPU torch 2.12.1. Engine packages were not changed. Model generation is CPU-only, two Torch threads, image splitting disabled, longest edge 512, at most 64 output tokens and a subprocess timeout of 45 seconds. The private Unix-socket service loads the helper in a bounded subprocess per image rather than keeping another model resident. Its cgroup allows at most 2300 MiB RAM, no swap and 150% CPU; the public gateway retains its original 128 MiB limit. The service has no Internet address family and denies GPU device paths. The gateway's existing one-generation lock bounds concurrency.

A real logo-image smoke test produced a recognizable logo description in about 10 seconds. This is a smoke test, not an accuracy benchmark. The small helper can hallucinate, truncate observations, miss text and details, and does not provide reliable measurements, identity verification or mechanical/medical diagnoses. The upstream model emits a pad-token configuration warning under the installed Transformers version; useful output was observed, but broader compatibility/quality evaluation remains required. No training was performed.

## Input and privacy

One PNG, JPEG or WebP image at a time, at most 3 MiB decoded and 8 megapixels; animations rejected. Image questions are limited to 500 characters to preserve space for observations on small checkpoints. No image URLs are fetched by the helper: clients submit bytes, blocking an image-fetch SSRF path. PIL validates/decodes input before inference and metadata is not retained in the helper image. Arbitrary model/repository names and remote model code are not accepted. Images and helper prompts are not logged or added to training datasets. Retrieved/recognized instructions are evidence only, never promoted to system messages; this boundary does not prove a small model is immune to prompt injection.

Public website image inputs are normalized in-browser to JPEG, at most 1536 pixels on the longest edge and 3 MiB, accepting source photos up to 20 MiB/40 megapixels in PNG/JPEG/WebP. Image-only uploads get a default question. The helper receives the actual user question. Public website uploads retain its existing authorized Storage behavior for user history. Local Chat's staged upload does not store original image bytes; it saves the final labeled response/metadata. This implementation does not add iOS PhotosPicker support or change the independent iOS parity PR.

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

## Current integration (2026-10-19)

This work is based on main after the Andromeda response-audit deployment. The gateway patch is regenerated against the installed source, preserving its tokenizer fix and diagnostic handlers. The API URL, TLS hostname, API key and Supabase function URLs remain unchanged. The existing pinned offline helper and CPU environment are reused; no new paid service or credentials are provisioned.

New coverage: 14 Edge transport tests, real-browser image resizing/type/size checks, 10 helper tests including question forwarding, timeout behavior and response-object isolation, five gateway integration tests, eight existing gateway regressions, three read-only network diagnostic tests, application TypeScript and production build. A real helper→running-Andromeda logo-image smoke test is recorded in `smoke-test.json`; its response and latency are observations, not a model-quality benchmark. A small helper/text checkpoint can misdescribe objects and miss fine text. No claim of accurate mechanical diagnosis, detailed OCR or general production quality is made.

The public UI must be published and its existing `chat-with-ai` function's bundled native adapter updated; enabling a helper on the server alone does not make the old public frontend accept images. Anonymous callers must remain unauthorized. The selected text checkpoint's model identity is preserved, with explicit helper provenance. No uploaded images or descriptions are added to training datasets by this integration.

## Activation verified

The helper service and same-URL gateway are active. The first direct-subprocess live attempt timed out under the gateway's existing **128 MiB** memory limit; that attempt was rolled back. The corrected deployment moves heavy inference to `cridergpt-vision-assist.service`, communicating only over a mode-0600 Unix socket inside its mode-0700 runtime directory. A live logo-image API request then completed in 19.75 seconds with EOS, correct selected-model identity and explicit helper provenance (`live-api-smoke-test.json`). The helper service's measured memory peak was about 1.32 GiB; idle memory returned to about 13 MiB. These are single-run measurements, not capacity benchmarks. Gateway memory limits were not raised.

The user-service environment could not support systemd `PrivateDevices` (startup error 218/CAPABILITIES), so the working unit instead denies the GPU device paths with `InaccessiblePaths`, restricts address families to Unix sockets and forces CPU inference. No privilege escalation or root service changes were used.

The existing Supabase `chat-with-ai` function was deployed as version **344**, replacing only its bundled `_shared/native-api.ts`. All other live source files were preserved and backed up privately first. Its existing `verify_jwt=false` setting was retained because its native branch explicitly validates the caller with `auth.getUser`; a live anonymous request returned **401** after deployment. No new secrets were created. A signed-in production browser session was not available for a final website-to-Edge user test, so that part must be verified after publishing the UI.

The main-based frontend permits one PNG/JPEG/WebP attachment, prepares a bounded JPEG copy, supplies a default question for image-only sends, keeps image history and model/helper metadata, and never executes image instructions as tools. Native cloud fallback is not introduced. Five private Unix-transport tests also passed. Public UI publication remains a separate required step; the previous Lovable deployment tool attempts returned `INVALID_ARGUMENT`.

Operations:

```bash
systemctl --user status cridergpt-vision-assist.service cridergpt-chat-api.service
journalctl --user -u cridergpt-vision-assist.service -u cridergpt-chat-api.service -n 50
```

Backups for the successful private-service deployment are under the ignored `deployment-backups/1792436480545408772/`, with exact target-to-original mappings in `manifest.json`. To roll back, stop the helper, restore only listed files (remove targets whose original value is null), run `systemctl --user daemon-reload`, and restart only the gateway. If reverting the Edge adapter too, use the private `edge-before-v343.json` source bundle and original auth setting. The model/venv, existing credentials, histories, GPU worker and reverse proxy must be preserved.

Large image requests acquire the existing generation semaphore **before** buffering their bodies, limiting the 128 MiB gateway to one large upload at a time. Busy uploads return 429 without allocating the body; two integration tests cover busy rejection and avoiding a second acquisition of the same lock. No second public endpoint was added.
