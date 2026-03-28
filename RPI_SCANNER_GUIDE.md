# CriderGPT Raspberry Pi NFC Scanner — Setup Guide

## Overview

This guide walks you through setting up a **Raspberry Pi** as a physical NFC scanner for your CriderGPT Livestock Smart ID system. The Pi reads NFC tags (stickers, fobs, ear tags) and sends the tag ID to your CriderGPT backend to pull up animal profiles in real-time.

## What You Need

### Hardware
- **Raspberry Pi 4 or 5** (any model with USB)
- **NFC/RFID Reader** — recommended: **ACR122U** USB NFC reader (~$30)
- **NFC Tags** — NTAG213/215/216 stickers or fobs (pre-written with CriderGPT IDs)
- **Power supply** for the Pi
- **MicroSD card** (16GB+) with Raspberry Pi OS
- **Optional**: Small LCD display (for showing scan results)

### Software
- Raspberry Pi OS (Lite or Desktop)
- Python 3.7+
- Internet connection (Wi-Fi or Ethernet)

## Step 1: Register the Device

1. Open CriderGPT → **Admin Panel** → **Devices** tab
2. Enter a device name (e.g., "Barn Scanner #1")
3. Select device type → **Raspberry Pi**
4. Click **Register Device**
5. **IMPORTANT**: Copy the API token immediately — it's only shown once!

## Step 2: Set Up the Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
sudo apt install -y python3-pip python3-usb libusb-1.0-0-dev

# Install required Python packages
pip3 install nfcpy requests

# Verify NFC reader is detected (plug in ACR122U first)
python3 -m nfc
```

### Permissions for USB NFC Reader

```bash
# Create udev rule for ACR122U
sudo tee /etc/udev/rules.d/99-nfc.rules << 'EOF'
SUBSYSTEM=="usb", ATTRS{idVendor}=="072f", ATTRS{idProduct}=="2200", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Step 3: Configure the Scanner

```bash
# Copy the scanner files to the Pi
# (download from your CriderGPT deployment or copy manually)

mkdir -p ~/cridergpt-scanner
cd ~/cridergpt-scanner

# Create config.json from the example
cp config.example.json config.json

# Edit config.json with your settings
nano config.json
```

Update `config.json`:
```json
{
  "api_url": "https://udpldrrpebdyuiqdtqnq.supabase.co",
  "device_token": "cgpt_dev_YOUR_TOKEN_HERE",
  "heartbeat_interval": 60,
  "play_sound": true
}
```

## Step 4: Run the Scanner

```bash
cd ~/cridergpt-scanner
python3 scanner.py
```

You should see:
```
============================================================
  CriderGPT Livestock Smart ID — Raspberry Pi Scanner
============================================================
  API: https://udpldrrpebdyuiqdtqnq.supabase.co
  Heartbeat: every 60s

[HEARTBEAT] OK — Barn Scanner #1
[NFC] Reader connected. Waiting for tags...
[NFC] Hold an NFC tag/fob near the reader to scan.
```

## Step 5: Run on Boot (Optional)

Create a systemd service to auto-start the scanner:

```bash
sudo tee /etc/systemd/system/cridergpt-scanner.service << 'EOF'
[Unit]
Description=CriderGPT NFC Scanner
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/cridergpt-scanner
ExecStart=/usr/bin/python3 /home/pi/cridergpt-scanner/scanner.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cridergpt-scanner
sudo systemctl start cridergpt-scanner

# Check status
sudo systemctl status cridergpt-scanner

# View live logs
journalctl -u cridergpt-scanner -f
```

## Troubleshooting

### "Could not find NFC reader"
- Make sure the ACR122U is plugged into a USB port
- Run `lsusb` to verify it shows up
- Check udev rules were applied: `sudo udevadm trigger`
- Try running with `sudo python3 scanner.py`

### "Connection error" on heartbeat/scan
- Check your internet connection: `ping google.com`
- Verify the API URL in config.json
- Make sure the device token is correct (re-register if needed)

### "Invalid device token"
- The token may have been copied incorrectly
- Register a new device in the Admin panel and get a fresh token

### Scanner stops after a while
- If running via systemd, it will auto-restart
- Check `journalctl -u cridergpt-scanner` for error details

## Manual Mode (No NFC Reader)

If you don't have an NFC reader yet, the scanner falls back to manual input mode where you can type tag IDs directly:

```
[MANUAL] Type a tag ID and press Enter to scan.
Tag ID > CriderGPT-A7X9K2
[SCAN] ✅ Animal found: Bessie (cattle)
```

## Security Notes

- The device token authenticates your Pi with the backend
- Tokens are stored hashed in the database
- Each device gets its own token — don't share between devices
- If a token is compromised, delete the device in Admin and re-register
