#!/usr/bin/env python3
"""
CriderGPT Livestock Smart ID — Raspberry Pi NFC Scanner
========================================================
Reads NFC tags and sends the tag ID to the CriderGPT backend.
Sends a heartbeat every 60 seconds to report device status.

Requirements:
  pip install nfcpy requests

Usage:
  python3 scanner.py

Configuration:
  Copy config.example.json to config.json and set your device token and API URL.
"""

import json
import os
import sys
import time
import threading
import signal

try:
    import nfc
except ImportError:
    print("ERROR: nfcpy is not installed. Run: pip install nfcpy")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests is not installed. Run: pip install requests")
    sys.exit(1)


# ─── Configuration ───────────────────────────────────────────────────────────

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

def load_config():
    if not os.path.exists(CONFIG_PATH):
        print(f"ERROR: config.json not found at {CONFIG_PATH}")
        print("Copy config.example.json to config.json and fill in your settings.")
        sys.exit(1)
    with open(CONFIG_PATH) as f:
        return json.load(f)


config = load_config()
API_URL = config.get("api_url", "").rstrip("/")
DEVICE_TOKEN = config.get("device_token", "")
HEARTBEAT_INTERVAL = config.get("heartbeat_interval", 60)
SCAN_SOUND = config.get("play_sound", False)

if not API_URL or not DEVICE_TOKEN:
    print("ERROR: api_url and device_token must be set in config.json")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {DEVICE_TOKEN}",
    "Content-Type": "application/json",
}

running = True


def signal_handler(sig, frame):
    global running
    print("\nShutting down...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ─── API Calls ───────────────────────────────────────────────────────────────

def send_heartbeat():
    """Send heartbeat to backend every HEARTBEAT_INTERVAL seconds."""
    while running:
        try:
            resp = requests.post(
                f"{API_URL}/functions/v1/scan-card",
                json={"action": "heartbeat"},
                headers=HEADERS,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                print(f"[HEARTBEAT] OK — {data.get('device_name', 'unknown')}")
            else:
                print(f"[HEARTBEAT] Error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[HEARTBEAT] Connection error: {e}")

        for _ in range(HEARTBEAT_INTERVAL):
            if not running:
                return
            time.sleep(1)


def send_scan(tag_id: str):
    """Send a scanned tag ID to the backend."""
    try:
        resp = requests.post(
            f"{API_URL}/functions/v1/scan-card",
            json={"action": "scan", "tag_id": tag_id},
            headers=HEADERS,
            timeout=10,
        )
        data = resp.json()

        if resp.status_code == 200:
            if "animal" in data:
                animal = data["animal"]
                name = animal.get("name") or animal.get("animal_id", "Unknown")
                species = animal.get("species", "")
                print(f"[SCAN] ✅ Animal found: {name} ({species})")
                print(f"       Tag: {tag_id}")
                if data.get("weights"):
                    latest = data["weights"][0]
                    print(f"       Last weight: {latest.get('weight_value', '?')} {latest.get('weight_unit', 'lbs')}")
            elif data.get("status") == "programmed":
                print(f"[SCAN] 📡 Tag programmed, ready to register: {tag_id}")
            elif data.get("status") == "unregistered":
                print(f"[SCAN] 📡 Tag in pool, not yet assigned: {tag_id}")
            else:
                print(f"[SCAN] Response: {json.dumps(data, indent=2)}")
        else:
            print(f"[SCAN] ❌ Error {resp.status_code}: {data.get('error', resp.text)}")

    except Exception as e:
        print(f"[SCAN] Connection error: {e}")


# ─── NFC Reader ──────────────────────────────────────────────────────────────

def extract_tag_id(tag) -> str:
    """Extract the CriderGPT tag ID from an NFC tag's NDEF records."""
    if tag.ndef:
        for record in tag.ndef.records:
            text = None
            if hasattr(record, "text"):
                text = record.text
            elif hasattr(record, "data"):
                try:
                    text = record.data.decode("utf-8")
                except Exception:
                    pass

            if text:
                # Handle CGPT: encrypted prefix
                if text.startswith("CGPT:"):
                    try:
                        import base64
                        decoded = json.loads(base64.b64decode(text[5:]).decode("utf-8"))
                        return decoded.get("id", text)
                    except Exception:
                        pass

                # Plain CriderGPT ID
                if text.startswith("CriderGPT-") or len(text) > 3:
                    return text.strip()

    # Fallback to tag UID
    return tag.identifier.hex().upper()


def on_tag_connect(tag):
    """Called when an NFC tag is detected."""
    tag_id = extract_tag_id(tag)
    print(f"\n{'='*50}")
    print(f"[NFC] Tag detected: {tag_id}")
    print(f"{'='*50}")

    if SCAN_SOUND:
        try:
            os.system("aplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null &")
        except Exception:
            pass

    send_scan(tag_id)
    return True  # Keep the connection alive briefly


def main():
    print("=" * 60)
    print("  CriderGPT Livestock Smart ID — Raspberry Pi Scanner")
    print("=" * 60)
    print(f"  API: {API_URL}")
    print(f"  Heartbeat: every {HEARTBEAT_INTERVAL}s")
    print()

    # Start heartbeat thread
    hb_thread = threading.Thread(target=send_heartbeat, daemon=True)
    hb_thread.start()

    # Start NFC reader
    print("[NFC] Waiting for NFC reader...")
    try:
        clf = nfc.ContactlessFrontend("usb")
    except Exception as e:
        print(f"[NFC] ERROR: Could not find NFC reader: {e}")
        print("[NFC] Make sure your NFC reader (e.g. ACR122U) is connected via USB.")
        print("[NFC] Falling back to manual input mode...")
        manual_mode()
        return

    print("[NFC] Reader connected. Waiting for tags...")
    print("[NFC] Hold an NFC tag/fob near the reader to scan.\n")

    while running:
        try:
            clf.connect(rdwr={"on-connect": on_tag_connect, "beep-on-connect": True})
            time.sleep(0.5)
        except Exception as e:
            print(f"[NFC] Read error: {e}")
            time.sleep(1)

    clf.close()
    print("Scanner stopped.")


def manual_mode():
    """Fallback: manually type tag IDs when no NFC reader is available."""
    print("\n[MANUAL] Type a tag ID and press Enter to scan.")
    print("[MANUAL] Type 'quit' to exit.\n")

    while running:
        try:
            tag_id = input("Tag ID > ").strip()
            if tag_id.lower() in ("quit", "exit", "q"):
                break
            if tag_id:
                send_scan(tag_id)
        except EOFError:
            break


if __name__ == "__main__":
    main()
