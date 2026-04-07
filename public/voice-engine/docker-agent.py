"""
CriderGPT Docker Agent
=======================
Replaces gui_agent.py — runs inside Docker instead of a standalone Python app.
Polls the agent_execution_queue table in Supabase for commands and executes them.

Capabilities:
  - File operations (read, write, list, delete)
  - Git operations (pull, commit, push, status, diff)
  - System info (CPU, RAM, disk, GPU, network)
  - Run shell commands (with safety checks)
  - Screenshot capture (if display available)
  - Docker container management (self-aware)

All results are written back to Supabase so CriderGPT can read them.
"""

import os
import json
import time
import subprocess
import platform
import logging
import shutil
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docker-agent")

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5100))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", 5))
WORKSPACE_DIR = os.environ.get("WORKSPACE_DIR", "/workspace")
KILL_SWITCH = False

# Safety: commands that are NEVER allowed
BLOCKED_COMMANDS = [
    "rm -rf /", "mkfs", "dd if=", ":(){", "fork bomb",
    "shutdown", "reboot", "halt", "poweroff",
    "chmod 777 /", "chown root",
]

PC_SPECS = {
    "cpu": "AMD Ryzen 3 3200G (4C/4T, integrated Vega 8)",
    "gpu": "XFX Radeon RX 580 8GB GDDR5 (RX-CYBERB)",
    "ram": "16GB DDR4",
    "motherboard": "ASRock A560M-HDV (Micro-ATX)",
    "case": "Cooler Master MasterBox Q300L",
    "psu": "500W (max draw ~109W)",
    "storage": "1TB SATA HDD",
    "cooling": "Case fans with LED HUD (SATA powered)",
    "network": "PCIe Wi-Fi + Bluetooth",
    "os": platform.system() + " " + platform.release(),
    "peripherals": ["Dell keyboard", "Dell mouse", "Razer BlackWidow Elite"],
}

# ============================================================
# Legacy Chatbot Engine — offline fallback (from chatbot_jessie.py)
# The very first AI system Jessie ever built, now embedded here
# as a fallback when external APIs are unreachable.
# ============================================================
LEGACY_RULES = [
    (["hello", "hi", "hey"], "Hey there! How can I help you today?"),
    (["how are you"], "I'm doing great. Thanks for asking!"),
    (["your name"], "I'm CriderGPT's Docker Agent — but my roots trace back to a simple Python chatbot."),
    (["help"], "I'm here for you! Ask me anything — running in legacy fallback mode."),
    (["bye", "goodbye"], "Take care! Talk to you later."),
    (["docker", "container"], "Your Docker stack: voice(5000), backup(5050), agent(5100). Run start.bat to launch."),
    (["error", "bug", "broken"], "Try checking Docker logs: docker-compose logs -f"),
    (["status", "health"], "I'll check system health for you."),
]

def legacy_chatbot_response(text: str) -> str:
    """Fallback response engine when Supabase/OpenAI is unreachable."""
    lower = text.lower().strip()
    for keywords, response in LEGACY_RULES:
        if any(kw in lower for kw in keywords):
            return response
    return "I'm running in legacy fallback mode and can't process that. Basic commands: hello, help, status, docker, bye."

os.makedirs(WORKSPACE_DIR, exist_ok=True)


def get_supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def is_command_safe(cmd: str) -> bool:
    """Check if a shell command is safe to run."""
    cmd_lower = cmd.lower().strip()
    for blocked in BLOCKED_COMMANDS:
        if blocked in cmd_lower:
            return False
    return True


def execute_command(command: str, context: dict = None) -> dict:
    """Execute an agent command and return the result."""
    global KILL_SWITCH
    if KILL_SWITCH:
        return {"status": "blocked", "error": "Kill switch is active"}

    cmd_type = command.split(":")[0].strip().lower() if ":" in command else command.strip().lower()
    cmd_body = command.split(":", 1)[1].strip() if ":" in command else ""

    try:
        # ── System Info ──
        if cmd_type in ("sysinfo", "system_info", "pc_specs"):
            return {
                "status": "ok",
                "pc_specs": PC_SPECS,
                "hostname": platform.node(),
                "python": platform.python_version(),
                "docker": True,
            }

        # ── File Operations ──
        elif cmd_type == "read_file":
            path = os.path.join(WORKSPACE_DIR, cmd_body)
            if os.path.exists(path):
                with open(path, "r") as f:
                    return {"status": "ok", "content": f.read()[:50000]}
            return {"status": "error", "error": f"File not found: {cmd_body}"}

        elif cmd_type == "write_file":
            parts = cmd_body.split("|||", 1)
            if len(parts) != 2:
                return {"status": "error", "error": "Format: write_file: path|||content"}
            path = os.path.join(WORKSPACE_DIR, parts[0].strip())
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                f.write(parts[1])
            return {"status": "ok", "path": path, "bytes": len(parts[1])}

        elif cmd_type == "list_files":
            target = os.path.join(WORKSPACE_DIR, cmd_body) if cmd_body else WORKSPACE_DIR
            if os.path.isdir(target):
                items = os.listdir(target)
                return {"status": "ok", "path": target, "items": items[:200]}
            return {"status": "error", "error": f"Not a directory: {target}"}

        elif cmd_type == "delete_file":
            path = os.path.join(WORKSPACE_DIR, cmd_body)
            if os.path.exists(path):
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                return {"status": "ok", "deleted": path}
            return {"status": "error", "error": f"Not found: {cmd_body}"}

        # ── Git Operations ──
        elif cmd_type in ("git_status", "git_pull", "git_diff", "git_log"):
            git_cmd = cmd_type.replace("git_", "git ")
            result = subprocess.run(
                git_cmd.split(), cwd=WORKSPACE_DIR,
                capture_output=True, text=True, timeout=30
            )
            return {"status": "ok", "output": result.stdout[:10000], "stderr": result.stderr[:2000]}

        elif cmd_type == "git_commit":
            msg = cmd_body or "Auto-commit from CriderGPT Agent"
            subprocess.run(["git", "add", "."], cwd=WORKSPACE_DIR, capture_output=True, timeout=15)
            result = subprocess.run(
                ["git", "commit", "-m", msg], cwd=WORKSPACE_DIR,
                capture_output=True, text=True, timeout=30
            )
            return {"status": "ok", "output": result.stdout[:5000]}

        elif cmd_type == "git_push":
            result = subprocess.run(
                ["git", "push"], cwd=WORKSPACE_DIR,
                capture_output=True, text=True, timeout=60
            )
            return {"status": "ok", "output": result.stdout[:5000], "stderr": result.stderr[:2000]}

        # ── Shell Commands (safety-checked) ──
        elif cmd_type in ("shell", "run", "exec"):
            if not is_command_safe(cmd_body):
                return {"status": "blocked", "error": f"Command blocked for safety: {cmd_body}"}
            result = subprocess.run(
                cmd_body, shell=True, cwd=WORKSPACE_DIR,
                capture_output=True, text=True, timeout=120
            )
            return {
                "status": "ok",
                "stdout": result.stdout[:20000],
                "stderr": result.stderr[:5000],
                "returncode": result.returncode,
            }

        # ── Disk / Resource Check ──
        elif cmd_type in ("disk", "disk_usage"):
            usage = shutil.disk_usage(WORKSPACE_DIR)
            return {
                "status": "ok",
                "total_gb": round(usage.total / (1024**3), 2),
                "used_gb": round(usage.used / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
            }

        # ── Kill Switch ──
        elif cmd_type == "kill":
            KILL_SWITCH = True
            return {"status": "ok", "message": "Kill switch activated — agent stopped"}

        elif cmd_type == "revive":
            KILL_SWITCH = False
            return {"status": "ok", "message": "Kill switch deactivated — agent resumed"}

        else:
            return {"status": "error", "error": f"Unknown command type: {cmd_type}"}

    except subprocess.TimeoutExpired:
        return {"status": "error", "error": "Command timed out"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def poll_queue():
    """Poll Supabase agent_execution_queue for pending commands."""
    if not SUPABASE_SERVICE_KEY:
        return

    import httpx

    headers = get_supabase_headers()
    url = f"{SUPABASE_URL}/rest/v1/agent_execution_queue?status=eq.pending&kill_switch=eq.false&order=created_at.asc&limit=1"

    try:
        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return

        tasks = resp.json()
        if not tasks:
            return

        task = tasks[0]
        task_id = task["id"]
        command = task["command"]

        logger.info("⚡ Executing: %s", command[:80])

        # Mark as started
        httpx.patch(
            f"{SUPABASE_URL}/rest/v1/agent_execution_queue?id=eq.{task_id}",
            headers=headers,
            json={"status": "running", "started_at": datetime.utcnow().isoformat()},
            timeout=10,
        )

        # Execute
        result = execute_command(command)

        # Mark as complete
        httpx.patch(
            f"{SUPABASE_URL}/rest/v1/agent_execution_queue?id=eq.{task_id}",
            headers=headers,
            json={
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
                "result": result,
            },
            timeout=10,
        )

        logger.info("✅ Done: %s → %s", command[:50], result.get("status"))

    except Exception as e:
        logger.error("Poll error: %s", e)


def background_poll():
    """Background thread that polls the queue."""
    while True:
        poll_queue()
        time.sleep(POLL_INTERVAL)


# ── HTTP API (direct access) ──

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "cridergpt-docker-agent",
        "kill_switch": KILL_SWITCH,
        "pc_specs": PC_SPECS,
        "workspace": WORKSPACE_DIR,
    })


@app.route("/execute", methods=["POST"])
def execute():
    data = request.json or {}
    command = data.get("command", "")
    if not command:
        return jsonify({"error": "Missing 'command'"}), 400
    result = execute_command(command, data.get("context"))
    return jsonify(result)


@app.route("/specs", methods=["GET"])
def specs():
    return jsonify(PC_SPECS)


@app.route("/kill", methods=["POST"])
def kill():
    global KILL_SWITCH
    KILL_SWITCH = True
    return jsonify({"status": "killed"})


@app.route("/revive", methods=["POST"])
def revive():
    global KILL_SWITCH
    KILL_SWITCH = False
    return jsonify({"status": "revived"})


if __name__ == "__main__":
    import threading
    t = threading.Thread(target=background_poll, daemon=True)
    t.start()
    logger.info("🤖 Docker Agent running on port %d (polling every %ds)", PORT, POLL_INTERVAL)
    logger.info("📟 PC: %s / %s / %s", PC_SPECS["cpu"], PC_SPECS["gpu"], PC_SPECS["ram"])
    app.run(host="0.0.0.0", port=PORT, debug=False)
