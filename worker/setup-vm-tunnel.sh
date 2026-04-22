#!/usr/bin/env bash
# ============================================================
# CriderGPT VM — One-Shot Permanent Cloudflare Tunnel Setup
# ============================================================
# Run this ONCE on your Ubuntu host (the server that runs the
# Win11 VM). It will:
#   1. Install cloudflared
#   2. Log you into Cloudflare (one browser click)
#   3. Create a NAMED tunnel (permanent URL — never changes)
#   4. Route vm.cridergpt.com -> http://localhost:6080 (noVNC)
#   5. Install it as a systemd service so it auto-starts on boot
#
# Usage:
#   chmod +x setup-vm-tunnel.sh
#   sudo ./setup-vm-tunnel.sh
# ============================================================

set -e

# ---- CONFIG (edit if you want a different subdomain) ----
TUNNEL_NAME="cridergpt-vm"
HOSTNAME="vm.cridergpt.com"
LOCAL_SERVICE="http://localhost:6080"
# ---------------------------------------------------------

if [[ $EUID -ne 0 ]]; then
  echo "❌ Run with sudo: sudo ./setup-vm-tunnel.sh"
  exit 1
fi

echo "🔧 [1/6] Installing cloudflared..."
if ! command -v cloudflared &> /dev/null; then
  curl -L --output /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
else
  echo "   ✅ Already installed: $(cloudflared --version)"
fi

echo ""
echo "🔐 [2/6] Logging into Cloudflare..."
echo "   A browser will open. Pick the 'cridergpt.com' zone and click Authorize."
sudo -u "$SUDO_USER" cloudflared tunnel login

# cert.pem lands in the invoking user's ~/.cloudflared
USER_HOME=$(eval echo ~"$SUDO_USER")
mkdir -p /etc/cloudflared
cp "$USER_HOME/.cloudflared/cert.pem" /etc/cloudflared/cert.pem

echo ""
echo "🚇 [3/6] Creating named tunnel '$TUNNEL_NAME' (permanent URL)..."
if cloudflared tunnel list --origincert /etc/cloudflared/cert.pem | grep -q "$TUNNEL_NAME"; then
  echo "   ℹ️  Tunnel already exists, reusing it."
else
  cloudflared tunnel --origincert /etc/cloudflared/cert.pem create "$TUNNEL_NAME"
fi

TUNNEL_ID=$(cloudflared tunnel --origincert /etc/cloudflared/cert.pem list \
  | awk -v n="$TUNNEL_NAME" '$2==n {print $1}')
echo "   ✅ Tunnel ID: $TUNNEL_ID"

# Move credentials file to /etc/cloudflared
if [ -f "$USER_HOME/.cloudflared/$TUNNEL_ID.json" ]; then
  cp "$USER_HOME/.cloudflared/$TUNNEL_ID.json" "/etc/cloudflared/$TUNNEL_ID.json"
fi

echo ""
echo "📝 [4/6] Writing tunnel config..."
cat > /etc/cloudflared/config.yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: /etc/cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: $LOCAL_SERVICE
    originRequest:
      noTLSVerify: true
      # WebSocket support for noVNC
      connectTimeout: 30s
      tcpKeepAlive: 30s
  - service: http_status:404
EOF
echo "   ✅ Config written to /etc/cloudflared/config.yml"

echo ""
echo "🌐 [5/6] Creating DNS route ($HOSTNAME -> tunnel)..."
cloudflared tunnel --origincert /etc/cloudflared/cert.pem route dns "$TUNNEL_NAME" "$HOSTNAME" || \
  echo "   ℹ️  DNS route may already exist — that's fine."

echo ""
echo "⚙️  [6/6] Installing as systemd service (auto-start on boot)..."
cloudflared --config /etc/cloudflared/config.yml service install || true
systemctl enable cloudflared
systemctl restart cloudflared
sleep 2
systemctl status cloudflared --no-pager -l | head -20

echo ""
echo "============================================================"
echo "✅ DONE — Permanent VM URL is live:"
echo ""
echo "   🌍 https://$HOSTNAME"
echo ""
echo "   This URL will NEVER change as long as you don't delete"
echo "   the '$TUNNEL_NAME' tunnel or the DNS record."
echo ""
echo "Next steps (security):"
echo "   1. Go to Cloudflare Zero Trust → Access → Applications"
echo "   2. Add an application for $HOSTNAME"
echo "   3. Require Google login (your email only) for humans"
echo "   4. Create a Service Token for CriderGPT to use"
echo ""
echo "Useful commands:"
echo "   • Check status:  sudo systemctl status cloudflared"
echo "   • View logs:     sudo journalctl -u cloudflared -f"
echo "   • Restart:       sudo systemctl restart cloudflared"
echo "============================================================"
