"""
CriderGPT PC Remote Agent (HTTP)
================================
Runs on YOUR PC. Exposes a small HTTP API that CriderGPT (cridergpt.com)
can call through a Cloudflare tunnel. Same shape as the Linux home-server
agent so the existing `home-server-proxy` edge function works unchanged.

Endpoints (all require:  Authorization: Bearer <CRIDERGPT_AGENT_TOKEN>)
  GET  /health
  POST /run         { "command": "dir" }
  POST /screenshot  -> { "image_b64": "..." }
  POST /click       { "x": 100, "y": 200 }
  POST /type        { "text": "hello" }
  POST /hotkey      { "keys": "ctrl+c" }
  POST /sysinfo

Install:
    pip install flask flask-cors pyautogui pillow

Run (Windows):
    set CRIDERGPT_AGENT_TOKEN=pick-a-long-random-string
    python cridergpt-pc-remote.py

Run (Linux/macOS):
    export CRIDERGPT_AGENT_TOKEN=pick-a-long-random-string
    python3 cridergpt-pc-remote.py

Then expose to the internet (one-liner, no account needed):
    cloudflared tunnel --url http://localhost:8787
Cloudflared prints a https://<random>.trycloudflare.com URL.
Paste that into Supabase secret HOME_SERVER_AGENT_URL and you're live.
"""
import base64
import io
import os
import platform
import shutil
import subprocess
import sys
from functools import wraps

try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
except ImportError:
    print("Install: pip install flask flask-cors pyautogui pillow", file=sys.stderr)
    sys.exit(1)

TOKEN = os.environ.get("CRIDERGPT_AGENT_TOKEN", "").strip()
PORT = int(os.environ.get("CRIDERGPT_AGENT_PORT", "8787"))
WORKSPACE = os.environ.get("CRIDERGPT_WORKSPACE", os.path.expanduser("~"))
BLOCKED = ["rm -rf /", "mkfs", "shutdown /s", "format c:", ":(){"]

if not TOKEN:
    print("ERROR: set CRIDERGPT_AGENT_TOKEN env var first.", file=sys.stderr)
    sys.exit(1)

app = Flask(__name__)
CORS(app)


def auth_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        h = request.headers.get("Authorization", "")
        if not h.startswith("Bearer ") or h.split(" ", 1)[1].strip() != TOKEN:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*a, **kw)
    return wrapper


def _safe(cmd: str) -> bool:
    low = cmd.lower()
    return not any(b in low for b in BLOCKED)


@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "host": platform.node(),
        "os": f"{platform.system()} {platform.release()}",
        "workspace": WORKSPACE,
    })


@app.post("/run")
@auth_required
def run_cmd():
    data = request.get_json(silent=True) or {}
    cmd = (data.get("command") or "").strip()
    timeout = int(data.get("timeout") or 60)
    if not cmd:
        return jsonify({"error": "command required"}), 400
    if not _safe(cmd):
        return jsonify({"error": "blocked: unsafe command"}), 400
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=WORKSPACE,
            capture_output=True, text=True, timeout=timeout,
        )
        return jsonify({
            "exit": r.returncode,
            "stdout": (r.stdout or "")[:200000],
            "stderr": (r.stderr or "")[:50000],
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/screenshot")
@auth_required
def screenshot():
    try:
        import pyautogui
        img = pyautogui.screenshot()
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return jsonify({"image_b64": base64.b64encode(buf.getvalue()).decode()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/click")
@auth_required
def click():
    import pyautogui
    d = request.get_json(silent=True) or {}
    pyautogui.click(int(d.get("x", 0)), int(d.get("y", 0)))
    return jsonify({"ok": True})


@app.post("/type")
@auth_required
def type_text():
    import pyautogui
    d = request.get_json(silent=True) or {}
    text = str(d.get("text", ""))
    pyautogui.typewrite(text, interval=0.02)
    return jsonify({"ok": True, "len": len(text)})


@app.post("/hotkey")
@auth_required
def hotkey():
    import pyautogui
    d = request.get_json(silent=True) or {}
    keys = [k.strip() for k in str(d.get("keys", "")).split("+") if k.strip()]
    pyautogui.hotkey(*keys)
    return jsonify({"ok": True, "keys": keys})


@app.post("/sysinfo")
@auth_required
def sysinfo():
    usage = shutil.disk_usage(WORKSPACE)
    return jsonify({
        "os": platform.system(),
        "release": platform.release(),
        "hostname": platform.node(),
        "python": platform.python_version(),
        "workspace": WORKSPACE,
        "disk_total_gb": usage.total // (1024 ** 3),
        "disk_free_gb": usage.free // (1024 ** 3),
    })


if __name__ == "__main__":
    print(f"CriderGPT PC Remote Agent listening on http://0.0.0.0:{PORT}")
    print(f"Workspace: {WORKSPACE}")
    print("Expose with:  cloudflared tunnel --url http://localhost:%d" % PORT)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
