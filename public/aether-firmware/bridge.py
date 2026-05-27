"""
AETHER firmware bridge.

Tiny WebSocket server that the CriderGPT Dev Hub AETHER Control Panel
pushes layouts + settings to. Writes them to disk so the LVGL renderer
can reload on the next frame.

Run on the device that drives the glass:
    pip install websockets
    python3 bridge.py
"""
import asyncio
import json
import os
import signal
from pathlib import Path

try:
    import websockets
except ImportError:
    raise SystemExit("Run: pip install websockets")

HERE = Path(__file__).parent
LAYOUT_FILE = HERE / "current_layout.json"
SETTINGS_FILE = HERE / "current_settings.json"
HOST = os.environ.get("AETHER_HOST", "0.0.0.0")
PORT = int(os.environ.get("AETHER_PORT", "8787"))


async def handle(ws):
    print(f"[aether] client connected from {ws.remote_address}")
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"ok": False, "err": "bad json"}))
                continue

            mtype = msg.get("type")
            if mtype == "layout":
                LAYOUT_FILE.write_text(json.dumps(msg.get("layout", {}), indent=2))
                settings = msg.get("settings")
                if settings:
                    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))
                print(f"[aether] layout pushed: {msg.get('layout', {}).get('name')}")
                await ws.send(json.dumps({"ok": True, "applied": "layout"}))
            elif mtype == "ping":
                await ws.send(json.dumps({"ok": True, "pong": True}))
            else:
                await ws.send(json.dumps({"ok": False, "err": f"unknown type {mtype}"}))
    except websockets.ConnectionClosed:
        pass
    finally:
        print("[aether] client disconnected")


async def main():
    print(f"[aether] bridge listening on ws://{HOST}:{PORT}")
    async with websockets.serve(handle, HOST, PORT):
        stop = asyncio.Future()
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, stop.set_result, None)
        await stop


if __name__ == "__main__":
    asyncio.run(main())
