"""
CriderGPT Local Ubuntu Worker
=============================
Polls Supabase for pending jobs in `worker_jobs` and runs them locally.

Design:
  - Supabase = source of truth (no inbound network needed on this server)
  - This worker pulls jobs via HTTPS using the SERVICE ROLE KEY
  - Atomic claim via the `claim_next_worker_job` RPC (FOR UPDATE SKIP LOCKED)
  - Easy to extend: add a new function to HANDLERS

Run:
  python3 worker.py
"""

from __future__ import annotations

import json
import logging
import os
import platform
import signal
import socket
import sys
import time
import traceback
from typing import Any, Callable

import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
WORKER_NAME = os.environ.get("WORKER_NAME", f"ubuntu-{socket.gethostname()}")
POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL", "3"))
HEARTBEAT_INTERVAL = float(os.environ.get("HEARTBEAT_INTERVAL", "30"))
JOB_TYPES = [t.strip() for t in os.environ.get("JOB_TYPES", "").split(",") if t.strip()] or None
WORKER_VERSION = "1.0.0"
CAPABILITIES = ["ping_test", "echo_text"]

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("worker")

# ── HTTP client ───────────────────────────────────────────────────────
HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
client = httpx.Client(base_url=SUPABASE_URL, headers=HEADERS, timeout=30.0)


# ── Job handlers ──────────────────────────────────────────────────────
def handle_ping_test(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "pong": True,
        "worker": WORKER_NAME,
        "host": platform.node(),
        "received": payload,
        "timestamp": time.time(),
    }


def handle_echo_text(payload: dict[str, Any]) -> dict[str, Any]:
    text = str(payload.get("text", ""))
    return {"echo": text, "length": len(text), "upper": text.upper()}


HANDLERS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "ping_test": handle_ping_test,
    "echo_text": handle_echo_text,
    # Future:
    # "ai_chat": handle_ai_chat,
    # "image_generation": handle_image_generation,
    # "file_processing": handle_file_processing,
}


# ── Supabase calls ────────────────────────────────────────────────────
def claim_job() -> dict[str, Any] | None:
    """Atomically claim one pending job."""
    body = {"p_worker_name": WORKER_NAME, "p_types": JOB_TYPES}
    r = client.post("/rest/v1/rpc/claim_next_worker_job", json=body)
    if r.status_code != 200:
        log.error("claim_job failed %s: %s", r.status_code, r.text[:300])
        return None
    rows = r.json() or []
    return rows[0] if rows else None


def finish_job(job_id: str, result: dict[str, Any]) -> None:
    payload = {
        "status": "complete",
        "result": result,
        "finished_at": "now()",
        "error": None,
    }
    r = client.patch(f"/rest/v1/worker_jobs?id=eq.{job_id}", json=payload)
    if r.status_code >= 300:
        log.error("finish_job failed %s: %s", r.status_code, r.text[:300])


def fail_job(job: dict[str, Any], err: str) -> None:
    attempts = job.get("attempts", 1)
    max_attempts = job.get("max_attempts", 3)
    next_status = "retry" if attempts < max_attempts else "failed"
    # Reset to pending if retrying, with backoff via scheduled_for
    if next_status == "retry":
        backoff_sec = min(60 * attempts, 600)
        scheduled = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + backoff_sec)
        )
        payload = {
            "status": "pending",
            "scheduled_for": scheduled,
            "error": err[:2000],
            "worker_name": None,
            "started_at": None,
        }
        log.warning("Job %s will retry in %ds (attempt %d/%d)",
                    job["id"], backoff_sec, attempts, max_attempts)
    else:
        payload = {
            "status": "failed",
            "error": err[:2000],
            "finished_at": "now()",
        }
        log.error("Job %s permanently failed after %d attempts", job["id"], attempts)

    r = client.patch(f"/rest/v1/worker_jobs?id=eq.{job['id']}", json=payload)
    if r.status_code >= 300:
        log.error("fail_job patch failed %s: %s", r.status_code, r.text[:300])


def heartbeat(jobs_processed_delta: int = 0) -> None:
    """Upsert worker_nodes row."""
    body = {
        "worker_name": WORKER_NAME,
        "hostname": platform.node(),
        "version": WORKER_VERSION,
        "capabilities": CAPABILITIES,
        "last_heartbeat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    r = client.post(
        "/rest/v1/worker_nodes?on_conflict=worker_name",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=body,
    )
    if r.status_code >= 300:
        log.debug("heartbeat upsert: %s %s", r.status_code, r.text[:200])


# ── Main loop ─────────────────────────────────────────────────────────
RUNNING = True


def shutdown(signum, frame):  # noqa: ARG001
    global RUNNING
    log.info("Signal %s received, shutting down…", signum)
    RUNNING = False


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)


def process_one() -> bool:
    job = claim_job()
    if not job:
        return False

    jtype = job["type"]
    log.info("⚡ Job %s | type=%s", job["id"], jtype)

    handler = HANDLERS.get(jtype)
    if handler is None:
        fail_job(job, f"No handler registered for type: {jtype}")
        return True

    try:
        result = handler(job.get("payload") or {})
        finish_job(job["id"], result)
        log.info("✅ Job %s complete", job["id"])
    except Exception as e:  # noqa: BLE001
        tb = traceback.format_exc()
        log.exception("❌ Job %s crashed: %s", job["id"], e)
        fail_job(job, f"{e}\n\n{tb}")
    return True


def main() -> None:
    log.info("👷 Worker '%s' starting (poll=%.1fs, types=%s)",
             WORKER_NAME, POLL_INTERVAL, JOB_TYPES or "ALL")
    last_hb = 0.0
    while RUNNING:
        try:
            now = time.time()
            if now - last_hb > HEARTBEAT_INTERVAL:
                heartbeat()
                last_hb = now

            did_work = process_one()
            if not did_work:
                time.sleep(POLL_INTERVAL)
        except httpx.HTTPError as e:
            log.error("HTTP error: %s", e)
            time.sleep(min(POLL_INTERVAL * 2, 15))
        except Exception as e:  # noqa: BLE001
            log.exception("Loop error: %s", e)
            time.sleep(POLL_INTERVAL)
    log.info("👋 Worker stopped cleanly")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        log.error("Missing required env var: %s", e)
        sys.exit(1)
