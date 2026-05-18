#!/usr/bin/env bash
# CriderGPT Full System Installer (Linux/macOS)
# Jessie Crider / 1995F150
# Usage:
#   curl -fsSL https://cridergpt.com/install-cridergpt.sh | bash
# or:
#   chmod +x install-cridergpt.sh && ./install-cridergpt.sh
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
say()  { echo -e "${G}▶ $*${N}"; }
warn() { echo -e "${Y}⚠ $*${N}"; }
die()  { echo -e "${R}✗ $*${N}"; exit 1; }
ask()  { read -rp "$1 [y/N]: " a; [[ "${a,,}" == "y" ]]; }

[[ $EUID -eq 0 ]] && die "Run as your normal user, not root (sudo is used where needed)."

ROOT="${CRIDERGPT_HOME:-$HOME/CriderGPT}"
REPO="${CRIDERGPT_REPO:-https://github.com/1995F150/cridergpt.git}"
mkdir -p "$ROOT"
cd "$ROOT"

echo "============================================================"
echo "  CriderGPT - Full System Installer"
echo "  Install root: $ROOT"
echo "============================================================"

# 1. Prereqs
say "[1/8] Checking prerequisites..."
MISS=0
for bin in git curl; do command -v $bin >/dev/null || { warn "missing: $bin"; MISS=1; }; done
if ! command -v node >/dev/null; then
  warn "Node.js missing."
  if ask "Install Node 20 LTS via NodeSource?"; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else MISS=1; fi
fi
command -v python3 >/dev/null || warn "python3 not found (needed for voice/MCP)"
command -v docker  >/dev/null || warn "docker not found (needed for self-hosted stack)"
[[ $MISS -eq 1 ]] && die "Install missing tools and re-run."
say "  OK."

# 2. Clone
say "[2/8] Cloning CriderGPT..."
if [[ -d "$ROOT/cridergpt/.git" ]]; then
  cd cridergpt && git pull origin main
else
  git clone "$REPO" && cd cridergpt
fi

# 3. npm install
say "[3/8] npm install..."
npm install --legacy-peer-deps || npm install --force

# 4. Build
say "[4/8] Production build..."
npm run build

# 5. Capacitor Android (optional)
if ask "[5/8] Sync Android (Capacitor) project?"; then
  npm install --legacy-peer-deps @capacitor/core @capacitor/cli @capacitor/android \
    @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app \
    @codetrix-studio/capacitor-google-auth
  [[ -d android ]] || npx cap add android
  npx cap sync android
fi

# 6. Electron desktop (optional)
if ask "[6/8] Package as Electron desktop app for this OS?"; then
  npm install --legacy-peer-deps --save-dev electron @electron/packager
  PLAT="linux"; [[ "$(uname)" == "Darwin" ]] && PLAT="darwin"
  npx @electron/packager . "CriderGPT" \
    --platform=$PLAT --arch=x64 --out=electron-release --overwrite \
    --ignore='^/src' --ignore='^/public' --ignore='^/electron-release'
  say "  Desktop build -> $PWD/electron-release/CriderGPT-${PLAT}-x64/"
fi

# 7. Docker stack (optional)
if ask "[7/8] Start self-hosted Docker stack (voice + backup + watchtower)?"; then
  if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
    warn "Docker not running - skipping."
  else
    ( cd public/voice-engine && docker compose up --build -d )
    say "  Voice engine:  http://localhost:5000/health"
    say "  Backup server: http://localhost:5050/health"
  fi
fi

# 8. Local MCP agent (optional)
if ask "[8/8] Install local PC automation agent (Python MCP)?"; then
  if command -v python3 >/dev/null; then
    python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null || python3 -m pip install --upgrade pip
    python3 -m pip install flask flask-cors requests httpx --break-system-packages 2>/dev/null \
      || python3 -m pip install flask flask-cors requests httpx
    say "  Launch:  python3 public/voice-engine/cridergpt-pc-mcp.py"
  else warn "python3 missing - skipping."; fi
fi

echo
say "DONE."
cat <<EOF
============================================================
  CriderGPT installed at: $PWD

  Dev server:     npm run dev          (http://localhost:5173)
  Prod preview:   npm run preview
  Android open:   npx cap open android
  Desktop app:    electron-release/CriderGPT-*-x64/CriderGPT
  Docker stack:   cd public/voice-engine && docker compose ps
  Live site:      https://cridergpt.com
============================================================
EOF
