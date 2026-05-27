# AETHER Firmware (Starter Scaffold)

This folder is the **on-glass firmware** for Project AETHER — the full-glass
touchscreen keyboard that replaces your PC keyboard with a haptic slab.

It is **not** part of the web app. The CriderGPT Dev Hub AETHER Control Panel
(`/devhub/aether`) talks to this firmware over a local WebSocket bridge.

## Architecture

```
+----------------+     USB-HID (keyboard + mouse)     +-----------+
|                | ---------------------------------> |           |
|  AETHER slab   |                                    |  Host PC  |
| (Pi / ESP32-S3 | <-- WebSocket layout/setting push -|           |
|  + cap-touch + |     ws://localhost:8787            +-----------+
|  haptic motor) |
+----------------+
       |
       |  LVGL renders keys, trackpad zone, status bar
       |  Haptic motor pulses on touch_down events
```

## Pieces

- `bridge.py` — tiny Python WebSocket server. Receives layout JSON from the
  CriderGPT control panel, writes it to `current_layout.json`, signals the
  LVGL renderer to reload.
- `firmware/` — LVGL C skeleton (`main.c`, `keyboard_ui.c`, `haptic.c`,
  `usb_hid.c`). Build with PlatformIO or CMake depending on target board.
- `current_layout.json` — last layout pushed from the control panel. Created
  at runtime; safe to delete.

## Recommended hardware

| Part            | Pick                                       |
| --------------- | ------------------------------------------ |
| Compute         | Raspberry Pi 5 (4 GB) **or** ESP32-S3 N16R8 |
| Display         | 15.6" capacitive touch panel (USB or HDMI+I2C) |
| Haptic          | DRV2605L + ERM/LRA motor                   |
| Trackpad zone   | Carved out of the same cap-touch surface (software) |
| Enclosure       | Tempered glass top, milled aluminum frame  |

## Boot flow

1. Power on → LVGL boots, loads `current_layout.json` (or default QWERTY)
2. `bridge.py` starts on `ws://0.0.0.0:8787`
3. CriderGPT control panel connects → push layouts / settings live
4. Every touch event:
   - LVGL hit-test → key
   - `haptic.c` pulses motor at configured strength
   - `usb_hid.c` emits HID keyboard report to host PC

## Build (Raspberry Pi target)

```bash
cd public/aether-firmware/firmware
cmake -B build
cmake --build build -j
sudo ./build/aether
# in another shell:
python3 ../bridge.py
```

## Not done yet

- [ ] Actual LVGL screens (only scaffolded)
- [ ] DRV2605L driver wiring
- [ ] Auto-switch-by-app (needs host-side helper reporting active window)
- [ ] OTA firmware update from the Dev Hub
