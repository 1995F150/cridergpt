#!/usr/bin/env bash
# CriderGPT Android Auto-Build Server — one-shot installer for Ubuntu
# Run on your Ubuntu server as the user that owns the build directory:
#   curl -fsSL https://cridergpt.com/voice-engine/android-builder/install.sh | bash
#
# Installs: OpenJDK 21, Android cmdline-tools, build-tools 34, platform 34,
# Gradle 8.7, Node 20, the build daemon (webhook + 60s GitHub poll),
# and a systemd unit so it survives reboots.

set -euo pipefail

BUILDER_HOME="${BUILDER_HOME:-$HOME/cridergpt-builder}"
ANDROID_SDK_ROOT="$BUILDER_HOME/android-sdk"
KEYSTORE_DIR="$BUILDER_HOME/keys"
OUTPUT_DIR="$BUILDER_HOME/builds"
REPO_URL="${REPO_URL:-https://github.com/YOUR_GITHUB_USER/cridergpt.git}"
REPO_DIR="$BUILDER_HOME/src"
WEBHOOK_PORT="${WEBHOOK_PORT:-5100}"

echo "==> CriderGPT Android Builder install"
echo "    BUILDER_HOME = $BUILDER_HOME"
echo "    REPO_URL     = $REPO_URL"

mkdir -p "$BUILDER_HOME" "$ANDROID_SDK_ROOT" "$KEYSTORE_DIR" "$OUTPUT_DIR"

# ---------- System packages ----------
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  curl wget unzip git ca-certificates \
  openjdk-21-jdk-headless python3 python3-pip python3-venv

# ---------- Node 20 (for vite build / cap sync) ----------
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ---------- Android cmdline-tools ----------
if [ ! -d "$ANDROID_SDK_ROOT/cmdline-tools/latest" ]; then
  echo "==> Downloading Android cmdline-tools"
  TMP=$(mktemp -d)
  wget -qO "$TMP/cli.zip" https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
  unzip -q "$TMP/cli.zip" -d "$ANDROID_SDK_ROOT/cmdline-tools"
  mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
  rm -rf "$TMP"
fi

export ANDROID_SDK_ROOT
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager --install \
  "platform-tools" \
  "platforms;android-34" \
  "build-tools;34.0.0"

# ---------- Gradle 8.7 ----------
if [ ! -d "$BUILDER_HOME/gradle-8.7" ]; then
  wget -qO /tmp/gradle.zip https://services.gradle.org/distributions/gradle-8.7-bin.zip
  unzip -q /tmp/gradle.zip -d "$BUILDER_HOME"
  rm /tmp/gradle.zip
fi

# ---------- Keystore (generated once, backed up by user) ----------
if [ ! -f "$KEYSTORE_DIR/cridergpt.jks" ]; then
  echo ""
  echo "==> No keystore found. Generating cridergpt.jks (25-year validity)."
  echo "    PICK A PASSWORD AND WRITE IT DOWN — you cannot recover it."
  read -srp "    Keystore password: " KSPASS; echo
  keytool -genkeypair -v \
    -keystore "$KEYSTORE_DIR/cridergpt.jks" \
    -alias cridergpt \
    -keyalg RSA -keysize 2048 -validity 9125 \
    -storepass "$KSPASS" -keypass "$KSPASS" \
    -dname "CN=Jessie Crider, O=CriderGPT, L=, ST=, C=US"
  echo "$KSPASS" > "$KEYSTORE_DIR/.password"
  chmod 600 "$KEYSTORE_DIR/.password" "$KEYSTORE_DIR/cridergpt.jks"
  echo ""
  echo "    SHA-1 fingerprint (paste into Firebase if you ever want native Google sign-in):"
  keytool -list -v -keystore "$KEYSTORE_DIR/cridergpt.jks" -alias cridergpt -storepass "$KSPASS" \
    | grep "SHA1:" || true
  echo ""
fi

# ---------- Pull repo ----------
if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi

# ---------- Python daemon ----------
python3 -m venv "$BUILDER_HOME/venv"
"$BUILDER_HOME/venv/bin/pip" install --quiet flask requests

cp "$REPO_DIR/public/voice-engine/android-builder/build-daemon.py" "$BUILDER_HOME/build-daemon.py"
cp "$REPO_DIR/public/voice-engine/android-builder/build.sh"        "$BUILDER_HOME/build.sh"
chmod +x "$BUILDER_HOME/build.sh"

# ---------- systemd service ----------
SERVICE_FILE=/etc/systemd/system/cridergpt-builder.service
sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=CriderGPT Android Auto-Build Daemon
After=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BUILDER_HOME
Environment="BUILDER_HOME=$BUILDER_HOME"
Environment="REPO_DIR=$REPO_DIR"
Environment="OUTPUT_DIR=$OUTPUT_DIR"
Environment="KEYSTORE_DIR=$KEYSTORE_DIR"
Environment="ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
Environment="GRADLE_HOME=$BUILDER_HOME/gradle-8.7"
Environment="PATH=$BUILDER_HOME/gradle-8.7/bin:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="WEBHOOK_PORT=$WEBHOOK_PORT"
ExecStart=$BUILDER_HOME/venv/bin/python $BUILDER_HOME/build-daemon.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cridergpt-builder
sudo systemctl restart cridergpt-builder

echo ""
echo "==> DONE."
echo "    Daemon listening on: http://$(hostname -I | awk '{print $1}'):$WEBHOOK_PORT"
echo "    Trigger a build:     curl -X POST http://localhost:$WEBHOOK_PORT/build"
echo "    Status:              curl http://localhost:$WEBHOOK_PORT/status"
echo "    Output APK/AAB go to: $OUTPUT_DIR"
echo "    Logs:                 sudo journalctl -fu cridergpt-builder"
