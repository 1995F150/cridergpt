# CriderGPT Android Auto-Build Server

Headless Ubuntu build box that turns every Lovable update into a signed APK + AAB
— no Android Studio, no Mac, no $30/mo CI service.

## One-line install (on your Ubuntu server)

```bash
REPO_URL=https://github.com/YOUR_USER/cridergpt.git \
  bash -c "$(curl -fsSL https://cridergpt.com/voice-engine/android-builder/install.sh)"
```

That single command:

1. Installs OpenJDK 21, Android SDK cmdline-tools, build-tools 34, platform 34, Gradle 8.7, Node 20.
2. Generates `cridergpt.jks` (25-year validity) the first time and prints its SHA-1.
3. Clones your repo to `~/cridergpt-builder/src`.
4. Installs the Python daemon and registers `cridergpt-builder.service` with systemd
   (auto-starts on boot, auto-restarts on crash).
5. Starts listening on **port 5100**.

## How rebuilds get triggered

| Trigger             | What happens                                                          |
| ------------------- | --------------------------------------------------------------------- |
| **Webhook (fast)**  | `POST http://server:5100/build` — wire it to GitHub Webhooks (push → main). Builds in seconds. |
| **Poll (fallback)** | Every 60s the daemon runs `git ls-remote origin main`. If the SHA changed, it rebuilds. Catches anything the webhook misses. |
| **Manual**          | `curl -X POST http://localhost:5100/build` or the `/devhub/android-builder` button in the app. |

## Endpoints

| Method | Path           | Use                                                  |
| ------ | -------------- | ---------------------------------------------------- |
| POST   | `/build`       | Kick a build now (webhook target)                    |
| GET    | `/status`      | JSON: `{ state, last_tag, log_tail, available_apks }` |
| GET    | `/latest.apk`  | Download newest signed APK                           |
| GET    | `/latest.aab`  | Download newest signed AAB (Play Store upload)       |

## Output naming

`CriderGPT-v1.4.2-build1716230400-2026-05-20.apk`
`CriderGPT-v1.4.2-build1716230400-2026-05-20.aab`

Version from `package.json`, build number = unix timestamp, date stamped.
Daemon keeps the **last 10** of each format and auto-deletes older ones.

## Wiring the GitHub webhook (one-time)

GitHub repo → **Settings → Webhooks → Add webhook**

- **Payload URL:** `http://YOUR_SERVER_IP:5100/build` (or Tailscale/Cloudflare Tunnel URL)
- **Content type:** `application/json`
- **Events:** Just the `push` event
- Save. Push a commit. Watch `sudo journalctl -fu cridergpt-builder`.

## Backup your keystore (do this once, then forget)

```bash
cp ~/cridergpt-builder/keys/cridergpt.jks /mnt/usb/backup/
cp ~/cridergpt-builder/keys/cridergpt.jks ~/Dropbox/CriderGPT-keys/
```

Lose this file = you can never update your app on the Play Store. Treat it like
a deed to the house.

## Notes

- The `android_app/` (a.k.a. `android/`) folder is **never modified** by the build script —
  only `npx cap sync android` copies the latest web `dist/` into it, then Gradle assembles.
- iOS builds still need Apple's signing infrastructure; this box doesn't try.
- Build time on a Ryzen 3 3200G: ~4–8 min clean, ~30–60s incremental.
