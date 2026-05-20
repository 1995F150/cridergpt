#!/usr/bin/env bash
# Single build run — pulls latest, builds web, syncs Capacitor, signs APK+AAB.
# Called by build-daemon.py (webhook or poll).
set -euo pipefail

REPO_DIR="${REPO_DIR:?}"
OUTPUT_DIR="${OUTPUT_DIR:?}"
KEYSTORE_DIR="${KEYSTORE_DIR:?}"

cd "$REPO_DIR"
git fetch --all --quiet
git reset --hard origin/main --quiet

VERSION=$(node -p "require('./package.json').version")
BUILD_NUM=$(date +%s)
DATE=$(date +%Y-%m-%d)
TAG="v${VERSION}-build${BUILD_NUM}-${DATE}"

echo "==> Building CriderGPT ${TAG}"

# 1. Web build
npm ci --no-audit --no-fund
npm run build

# 2. Capacitor sync (android/ is managed; we DO NOT modify sources, only sync the web dist)
npx cap sync android

# 3. Gradle assemble + bundle
cd android_app
KSPASS=$(cat "$KEYSTORE_DIR/.password")

./gradlew \
  -Pandroid.injected.signing.store.file="$KEYSTORE_DIR/cridergpt.jks" \
  -Pandroid.injected.signing.store.password="$KSPASS" \
  -Pandroid.injected.signing.key.alias=cridergpt \
  -Pandroid.injected.signing.key.password="$KSPASS" \
  assembleRelease bundleRelease

APK_SRC=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
AAB_SRC=$(find app/build/outputs/bundle/release -name "*.aab" | head -1)

cp "$APK_SRC" "$OUTPUT_DIR/CriderGPT-${TAG}.apk"
cp "$AAB_SRC" "$OUTPUT_DIR/CriderGPT-${TAG}.aab"

# Keep last 10 builds
cd "$OUTPUT_DIR"
ls -1t CriderGPT-*.apk 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -1t CriderGPT-*.aab 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "==> Done: $OUTPUT_DIR/CriderGPT-${TAG}.{apk,aab}"
echo "${TAG}" > "$OUTPUT_DIR/.latest"
