"""
CriderGPT Backup Server
========================
Scheduled backups of Supabase data to local storage.
Runs alongside the voice engine in Docker.

Endpoints:
  GET  /health          — health check
  GET  /backups         — list all backups
  POST /backup/now      — trigger manual backup
  GET  /backup/latest   — download latest backup
"""

import os
import json
import time
import threading
import logging
from datetime import datetime
from flask import Flask, jsonify, send_file
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backup-server")

app = Flask(__name__)
CORS(app)

BACKUP_DIR = "/app/backups"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BACKUP_INTERVAL = int(os.environ.get("BACKUP_INTERVAL_HOURS", 6)) * 3600
PORT = int(os.environ.get("PORT", 5050))

TABLES_TO_BACKUP = [
    "profiles", "ai_usage", "ai_memory", "ai_interactions",
    "chat_conversations", "chat_messages", "events", "chapters",
    "filter_orders", "buyers", "livestock_animals", "livestock_health_records",
    "feature_settings", "broadcast_history", "build_logs",
]

os.makedirs(BACKUP_DIR, exist_ok=True)


def run_backup():
    """Pull data from Supabase tables and save as JSON."""
    if not SUPABASE_SERVICE_KEY:
        logger.warning("No SUPABASE_SERVICE_KEY set — skipping backup")
        return None

    try:
        import httpx

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f"backup_{timestamp}")
        os.makedirs(backup_path, exist_ok=True)

        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }

        summary = {}
        for table in TABLES_TO_BACKUP:
            try:
                url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=10000"
                resp = httpx.get(url, headers=headers, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    with open(os.path.join(backup_path, f"{table}.json"), "w") as f:
                        json.dump(data, f, indent=2, default=str)
                    summary[table] = len(data)
                    logger.info("  ✅ %s: %d rows", table, len(data))
                else:
                    summary[table] = f"error:{resp.status_code}"
                    logger.warning("  ❌ %s: HTTP %d", table, resp.status_code)
            except Exception as e:
                summary[table] = f"error:{e}"
                logger.error("  ❌ %s: %s", table, e)

        # Save manifest
        with open(os.path.join(backup_path, "manifest.json"), "w") as f:
            json.dump({
                "timestamp": timestamp,
                "tables": summary,
                "supabase_url": SUPABASE_URL,
            }, f, indent=2)

        logger.info("🗄️ Backup complete: %s", backup_path)
        return backup_path

    except Exception as e:
        logger.error("Backup failed: %s", e)
        return None


def scheduled_backups():
    """Background thread for scheduled backups."""
    while True:
        time.sleep(BACKUP_INTERVAL)
        logger.info("⏰ Running scheduled backup...")
        run_backup()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "cridergpt-backup-server",
        "backup_interval_hours": BACKUP_INTERVAL // 3600,
        "has_service_key": bool(SUPABASE_SERVICE_KEY),
    })


@app.route("/backups", methods=["GET"])
def list_backups():
    backups = sorted([
        d for d in os.listdir(BACKUP_DIR)
        if os.path.isdir(os.path.join(BACKUP_DIR, d))
    ], reverse=True)

    result = []
    for b in backups:
        manifest_path = os.path.join(BACKUP_DIR, b, "manifest.json")
        if os.path.exists(manifest_path):
            with open(manifest_path) as f:
                result.append(json.load(f))
        else:
            result.append({"name": b})

    return jsonify({"backups": result, "total": len(result)})


@app.route("/backup/now", methods=["POST"])
def backup_now():
    path = run_backup()
    if path:
        return jsonify({"status": "ok", "path": path})
    return jsonify({"status": "error", "message": "Backup failed — check SUPABASE_SERVICE_KEY"}), 500


@app.route("/backup/latest", methods=["GET"])
def latest_backup():
    backups = sorted([
        d for d in os.listdir(BACKUP_DIR)
        if os.path.isdir(os.path.join(BACKUP_DIR, d))
    ], reverse=True)

    if not backups:
        return jsonify({"error": "No backups found"}), 404

    manifest_path = os.path.join(BACKUP_DIR, backups[0], "manifest.json")
    if os.path.exists(manifest_path):
        return send_file(manifest_path, mimetype="application/json")
    return jsonify({"error": "No manifest"}), 404


if __name__ == "__main__":
    # Start scheduled backup thread
    t = threading.Thread(target=scheduled_backups, daemon=True)
    t.start()

    # Run initial backup on startup
    logger.info("🚀 Backup server starting — running initial backup...")
    run_backup()

    logger.info("🗄️ Backup server running on port %d (every %dh)", PORT, BACKUP_INTERVAL // 3600)
    app.run(host="0.0.0.0", port=PORT, debug=False)
