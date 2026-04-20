#!/usr/bin/env bash
# CriderGPT Server Auto-Installer
# Target: Ubuntu Server 22.04 / 24.04 with AMD GPU
# Run as your normal user (not root). Will sudo when needed.
#
# Usage:
#   chmod +x install-server.sh
#   ./install-server.sh
#
set -euo pipefail

C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[0;31m'; C_OFF='\033[0m'
say()  { echo -e "${C_GREEN}▶ $*${C_OFF}"; }
warn() { echo -e "${C_YELLOW}⚠ $*${C_OFF}"; }
die()  { echo -e "${C_RED}✗ $*${C_OFF}"; exit 1; }

[[ $EUID -eq 0 ]] && die "Run as your normal user, not root. The script uses sudo when needed."

# ─── 1. System packages ────────────────────────────────────────────────
say "Updating apt and installing base packages…"
sudo apt update
sudo apt install -y \
  curl wget git python3 python3-venv python3-pip \
  build-essential ffmpeg \
  vulkan-tools mesa-vulkan-drivers \
  libgl1 libglib2.0-0 \
  htop ncdu unzip ufw

# ─── 2. Detect GPU ─────────────────────────────────────────────────────
say "Detecting GPU…"
GPU_INFO=$(lspci | grep -iE 'vga|3d|display' || true)
echo "$GPU_INFO"
if echo "$GPU_INFO" | grep -qi nvidia; then
  warn "NVIDIA detected — this script assumes AMD. You may want CUDA instead. Continuing with Vulkan anyway."
elif echo "$GPU_INFO" | grep -qi amd; then
  say "AMD GPU confirmed. Using Vulkan path."
else
  warn "No discrete GPU detected. Will fall back to CPU mode (slow image gen)."
fi
vulkaninfo --summary 2>/dev/null | head -10 || warn "vulkaninfo not reporting — Vulkan may need a reboot."

# ─── 3. Folders ────────────────────────────────────────────────────────
say "Creating /opt/cridergpt folder layout…"
sudo mkdir -p /opt/cridergpt/{voice-samples,reference-photos,generated-images,generated-audio,training-data,backups}
sudo chown -R "$USER:$USER" /opt/cridergpt

# ─── 4. Ollama (AI chat) ───────────────────────────────────────────────
if ! command -v ollama >/dev/null 2>&1; then
  say "Installing Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
else
  say "Ollama already installed."
fi
say "Pulling default model (llama3.1:8b — ~4.7 GB)…"
ollama pull llama3.1:8b || warn "Model pull failed; you can retry later with: ollama pull llama3.1:8b"

# ─── 5. SD.Next (image gen) ────────────────────────────────────────────
if [[ ! -d /opt/sdnext/.git ]]; then
  say "Installing SD.Next…"
  sudo mkdir -p /opt/sdnext
  sudo chown "$USER:$USER" /opt/sdnext
  git clone https://github.com/vladmandic/automatic /opt/sdnext
else
  say "SD.Next already cloned."
fi

# ─── 6. Worker user + folder ───────────────────────────────────────────
if ! id -u cridergpt >/dev/null 2>&1; then
  say "Creating cridergpt service user…"
  sudo useradd -r -m -d /opt/cridergpt-worker -s /bin/bash cridergpt
fi
sudo mkdir -p /opt/cridergpt-worker
sudo chown cridergpt:cridergpt /opt/cridergpt-worker

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
say "Copying worker files from $SCRIPT_DIR …"
sudo cp "$SCRIPT_DIR/worker.py" /opt/cridergpt-worker/
sudo cp "$SCRIPT_DIR/requirements.txt" /opt/cridergpt-worker/
[[ -f /opt/cridergpt-worker/.env ]] || sudo cp "$SCRIPT_DIR/.env.example" /opt/cridergpt-worker/.env
sudo chown -R cridergpt:cridergpt /opt/cridergpt-worker
sudo chmod 600 /opt/cridergpt-worker/.env

say "Building worker venv…"
sudo -u cridergpt bash -c '
  cd /opt/cridergpt-worker
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt
'

# ─── 7. systemd service ────────────────────────────────────────────────
say "Installing systemd service…"
sudo cp "$SCRIPT_DIR/cridergpt-worker.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cridergpt-worker

# ─── 8. Firewall ───────────────────────────────────────────────────────
say "Configuring firewall (deny incoming except SSH)…"
sudo ufw --force default deny incoming
sudo ufw --force default allow outgoing
sudo ufw allow ssh
sudo ufw --force enable

# ─── 9. Done ───────────────────────────────────────────────────────────
echo
say "✅ Base install complete."
echo
warn "NEXT STEPS — do these manually:"
echo "  1. Edit /opt/cridergpt-worker/.env  →  paste your SUPABASE_SERVICE_ROLE_KEY"
echo "       sudo nano /opt/cridergpt-worker/.env"
echo "  2. Start the worker:"
echo "       sudo systemctl start cridergpt-worker"
echo "       journalctl -u cridergpt-worker -f"
echo "  3. First-launch SD.Next (downloads ~4 GB of dependencies):"
echo "       cd /opt/sdnext && ./webui.sh --use-zluda --listen --port 7860 --api"
echo "  4. (Optional) Install XTTS voice cloning — see SERVER_SETUP_GUIDE.md Part 5"
echo "  5. Read worker/SERVER_SETUP_GUIDE.md for the full hybrid architecture walkthrough."
echo
say "Welcome to the hybrid era. 🚜"
