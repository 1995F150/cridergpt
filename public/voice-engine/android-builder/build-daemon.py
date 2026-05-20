#!/usr/bin/env python3
"""
CriderGPT Android build daemon.

- Webhook:  POST http://<server>:5100/build       -> kicks a build now
- Status:   GET  http://<server>:5100/status      -> { state, last_tag, log_tail }
- Download: GET  http://<server>:5100/latest.apk  -> serves newest signed APK
- Download: GET  http://<server>:5100/latest.aab  -> serves newest signed AAB
- Poll:     every 60s, checks `git ls-remote origin main`. If commit changed -> build.

Env vars (set by systemd unit from install.sh):
  BUILDER_HOME, REPO_DIR, OUTPUT_DIR, KEYSTORE_DIR, WEBHOOK_PORT
"""
import os, subprocess, threading, time, glob, json, logging
from pathlib import Path
from flask import Flask, jsonify, send_file, abort

BUILDER_HOME = Path(os.environ["BUILDER_HOME"])
REPO_DIR     = Path(os.environ["REPO_DIR"])
OUTPUT_DIR   = Path(os.environ["OUTPUT_DIR"])
PORT         = int(os.environ.get("WEBHOOK_PORT", "5100"))
BUILD_SH     = BUILDER_HOME / "build.sh"
LOG_FILE     = BUILDER_HOME / "build.log"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("builder")

app = Flask(__name__)
state = {"state": "idle", "last_tag": None, "last_error": None, "started_at": None}
state_lock = threading.Lock()
_last_remote_sha = None


def run_build():
    with state_lock:
        if state["state"] == "building":
            return False
        state["state"] = "building"
        state["started_at"] = time.time()
        state["last_error"] = None
    try:
        log.info("Build started")
        with open(LOG_FILE, "ab", buffering=0) as lf:
            lf.write(f"\n\n===== BUILD {time.ctime()} =====\n".encode())
            proc = subprocess.run(
                ["bash", str(BUILD_SH)],
                stdout=lf, stderr=subprocess.STDOUT, check=False,
            )
        tag_file = OUTPUT_DIR / ".latest"
        tag = tag_file.read_text().strip() if tag_file.exists() else None
        if proc.returncode == 0:
            log.info("Build OK: %s", tag)
            with state_lock:
                state["state"] = "idle"
                state["last_tag"] = tag
        else:
            log.error("Build FAILED (exit %s)", proc.returncode)
            with state_lock:
                state["state"] = "failed"
                state["last_error"] = f"exit {proc.returncode}"
        return proc.returncode == 0
    except Exception as e:
        log.exception("Build crashed")
        with state_lock:
            state["state"] = "failed"
            state["last_error"] = str(e)
        return False


def remote_sha():
    try:
        out = subprocess.check_output(
            ["git", "-C", str(REPO_DIR), "ls-remote", "origin", "main"],
            stderr=subprocess.DEVNULL, timeout=20,
        ).decode().strip().split()
        return out[0] if out else None
    except Exception:
        return None


def poll_loop():
    global _last_remote_sha
    # seed
    _last_remote_sha = remote_sha()
    while True:
        time.sleep(60)
        sha = remote_sha()
        if sha and sha != _last_remote_sha:
            log.info("Poll detected new commit: %s", sha[:8])
            _last_remote_sha = sha
            run_build()


@app.post("/build")
def trigger():
    """Webhook endpoint — wire to Lovable/GitHub push events."""
    t = threading.Thread(target=run_build, daemon=True)
    t.start()
    return jsonify(ok=True, message="Build queued")


@app.get("/status")
def status():
    log_tail = ""
    if LOG_FILE.exists():
        with open(LOG_FILE, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 4000))
            log_tail = f.read().decode("utf-8", errors="replace")
    with state_lock:
        s = dict(state)
    apks = sorted(glob.glob(str(OUTPUT_DIR / "CriderGPT-*.apk")), reverse=True)
    aabs = sorted(glob.glob(str(OUTPUT_DIR / "CriderGPT-*.aab")), reverse=True)
    s["available_apks"] = [Path(p).name for p in apks[:5]]
    s["available_aabs"] = [Path(p).name for p in aabs[:5]]
    s["log_tail"] = log_tail[-2000:]
    return jsonify(s)


@app.get("/latest.apk")
def latest_apk():
    files = sorted(glob.glob(str(OUTPUT_DIR / "CriderGPT-*.apk")), reverse=True)
    if not files: abort(404)
    return send_file(files[0], as_attachment=True)


@app.get("/latest.aab")
def latest_aab():
    files = sorted(glob.glob(str(OUTPUT_DIR / "CriderGPT-*.aab")), reverse=True)
    if not files: abort(404)
    return send_file(files[0], as_attachment=True)


if __name__ == "__main__":
    threading.Thread(target=poll_loop, daemon=True).start()
    log.info("Daemon listening on :%d", PORT)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
