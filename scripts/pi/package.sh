#!/usr/bin/env bash
# Builds MachNha on your computer and packs a self-contained bundle for a Raspberry Pi (arm64).
# The bundle is pure JavaScript (no native modules), so an x86-64 build runs fine on the Pi.
#
# Usage:  scripts/pi/package.sh            → dist/machnha-pi-<version>-<date>.tar.gz
#         SKIP_BUILD=1 scripts/pi/package.sh (reuse an existing .next build)
set -euo pipefail
cd "$(dirname "$0")/../.."

VERSION="$(node -p "require('./package.json').version")"
STAMP="$(date +%Y%m%d-%H%M)"
OUT="dist/machnha-pi"
TARBALL="dist/machnha-pi-${VERSION}-${STAMP}.tar.gz"

if [ -z "${SKIP_BUILD:-}" ]; then
  echo "▶ npm ci"; npm ci --no-audit --no-fund
  echo "▶ npm run firmware:demo (chỉ tạo file giữ chỗ còn thiếu cho manifest demo)"; npm run -s firmware:demo
  echo "▶ npm run build"; npm run -s build
fi
[ -d .next/standalone ] || { echo "Thiếu .next/standalone — next.config.ts cần output: 'standalone'"; exit 1; }

echo "▶ Assembling $OUT"
rm -rf "$OUT" && mkdir -p "$OUT"
# Standalone server + its pruned node_modules
cp -a .next/standalone/. "$OUT/"
# next/image is disabled (images.unoptimized) → drop the optional sharp native binaries (x64-only, useless on the Pi)
rm -rf "$OUT/node_modules/sharp" "$OUT/node_modules/@img"
# Static assets are not part of standalone by design
mkdir -p "$OUT/.next/static" && cp -a .next/static/. "$OUT/.next/static/"
[ -d public ] && cp -a public "$OUT/public"
# Content + firmware are read at runtime (dynamic routes & API); copy explicitly even if traced.
rm -rf "$OUT/content" "$OUT/firmware"
cp -a content "$OUT/content"
cp -a firmware "$OUT/firmware"
# Pi helpers
cp scripts/pi/install-pi.sh scripts/pi/machnha.service scripts/pi/Caddyfile scripts/pi/README-PI.md "$OUT/"
chmod +x "$OUT/install-pi.sh"
cat > "$OUT/.env.example" <<ENV
# Bắt buộc ở production: 32 byte ngẫu nhiên (openssl rand -hex 32). install-pi.sh tự sinh nếu thiếu.
FLASH_SECRET=
# Chỉ cần khi kho firmware chứa file .enc (xem README):
FIRMWARE_MASTER_KEY=
# Cổng và địa chỉ lắng nghe của server Node (Caddy proxy tới cổng này)
PORT=3000
HOSTNAME=0.0.0.0
# Gói này chứa firmware demo; xoá dòng dưới khi đã thay bằng firmware thật.
ALLOW_DEMO_FIRMWARE=1
# Giới hạn heap V8 cho Pi 3 (1 GB RAM)
NODE_OPTIONS=--max-old-space-size=384
ENV
printf '%s\n' "version=${VERSION}" "built=$(date -Iseconds)" "node=$(node --version)" "arch_note=pure-js bundle, runs on linux-arm64" > "$OUT/VERSION"

mkdir -p dist
tar -C dist -czf "$TARBALL" machnha-pi
echo "✓ $TARBALL ($(du -h "$TARBALL" | cut -f1))"
echo "Tiếp theo: scp \"$TARBALL\" pi@raspberrypi.local:~/ rồi làm theo README-PI.md"
