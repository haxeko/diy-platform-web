#!/usr/bin/env bash
# Installs / upgrades MachNha on a Raspberry Pi (Raspberry Pi OS Lite 64-bit) from the packaged bundle.
# Run from inside the extracted bundle directory, as root:
#   sudo ./install-pi.sh [--with-caddy] [--node-version 22.20.0] [--port 3000]
set -euo pipefail

APP_DIR=/opt/machnha
APP_USER=machnha
NODE_VERSION="${NODE_VERSION:-22.20.0}"
PORT=3000
WITH_CADDY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --with-caddy) WITH_CADDY=1 ;;
    --node-version) NODE_VERSION="$2"; shift ;;
    --port) PORT="$2"; shift ;;
    -h|--help) sed -n 2,5p "$0"; exit 0 ;;
    *) echo "Tham số không hợp lệ: $1"; exit 1 ;;
  esac
  shift
done

[ "$(id -u)" -eq 0 ] || { echo "Hãy chạy bằng sudo."; exit 1; }
SRC="$(cd "$(dirname "$0")" && pwd)"
[ -f "$SRC/server.js" ] || { echo "Không thấy server.js cạnh script — hãy chạy từ thư mục gói đã giải nén."; exit 1; }

ARCH="$(uname -m)"
case "$ARCH" in
  aarch64|arm64) NODE_ARCH=arm64 ;;
  x86_64) NODE_ARCH=x64 ;;
  armv7l) echo "Hệ điều hành 32-bit (armv7l). Hãy cài Raspberry Pi OS Lite 64-bit."; exit 1 ;;
  *) echo "Kiến trúc không hỗ trợ: $ARCH"; exit 1 ;;
esac

# ---------- Node.js ----------
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] && need_node=0
fi
if [ "$need_node" -eq 1 ]; then
  echo "▶ Cài Node.js v${NODE_VERSION} (${NODE_ARCH}) vào /usr/local"
  TMP="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o "$TMP/node.tar.xz"
  tar -xJf "$TMP/node.tar.xz" -C /usr/local --strip-components=1 --no-same-owner
  rm -rf "$TMP"
fi
NODE_BIN="$(command -v node)"
echo "✓ Node $("$NODE_BIN" --version) tại $NODE_BIN"

# ---------- user + files ----------
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
if [ -d "$APP_DIR" ]; then
  BACKUP="${APP_DIR}.bak-$(date +%Y%m%d-%H%M%S)"
  echo "▶ Sao lưu bản cũ sang $BACKUP (giữ lại .env)"
  mv "$APP_DIR" "$BACKUP"
  mkdir -p "$APP_DIR"
  [ -f "$BACKUP/.env" ] && cp "$BACKUP/.env" "$APP_DIR/.env"
else
  mkdir -p "$APP_DIR"
fi
echo "▶ Chép gói vào $APP_DIR"
tar -C "$SRC" -cf - --exclude=./install-pi.sh . | tar -C "$APP_DIR" -xf -
install -m 0755 "$SRC/install-pi.sh" "$APP_DIR/install-pi.sh"

# ---------- .env ----------
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi
if ! grep -qE '^FLASH_SECRET=.{32,}' "$APP_DIR/.env"; then
  SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  if grep -q '^FLASH_SECRET=' "$APP_DIR/.env"; then
    sed -i "s|^FLASH_SECRET=.*|FLASH_SECRET=${SECRET}|" "$APP_DIR/.env"
  else
    printf 'FLASH_SECRET=%s\n' "$SECRET" >> "$APP_DIR/.env"
  fi
  echo "✓ Đã sinh FLASH_SECRET mới"
fi
if grep -q '^PORT=' "$APP_DIR/.env"; then sed -i "s|^PORT=.*|PORT=${PORT}|" "$APP_DIR/.env"; else printf 'PORT=%s\n' "$PORT" >> "$APP_DIR/.env"; fi
grep -q '^HOSTNAME=' "$APP_DIR/.env" || printf 'HOSTNAME=0.0.0.0\n' >> "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------- systemd ----------
sed -e "s|/usr/local/bin/node|${NODE_BIN}|" "$APP_DIR/machnha.service" > /etc/systemd/system/machnha.service
systemctl daemon-reload
systemctl enable --now machnha.service
sleep 2
systemctl --no-pager --lines=5 status machnha.service || true

# ---------- optional Caddy (HTTPS for Web Serial on the LAN) ----------
if [ "$WITH_CADDY" -eq 1 ]; then
  if ! command -v caddy >/dev/null 2>&1; then
    echo "▶ Cài Caddy"
    apt-get update -qq && apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy >/dev/null
  fi
  HOSTS="$(hostname).local"
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  [ -n "$IP" ] && HOSTS="$HOSTS, $IP"
  sed -e "s|^raspberrypi.local, machnha.local, 192.168.1.50 {|${HOSTS} {|" -e "s|127.0.0.1:3000|127.0.0.1:${PORT}|" "$APP_DIR/Caddyfile" > /etc/caddy/Caddyfile
  systemctl restart caddy
  echo "✓ Caddy phục vụ HTTPS tại https://${HOSTS//, / và https://}"
  echo "  Chứng chỉ gốc để import vào máy tính: /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt"
fi

echo
echo "======================================================"
echo " MachNha đã chạy: http://$(hostname).local:${PORT}  (trên chính Pi: http://localhost:${PORT})"
echo " Nhật ký:   journalctl -u machnha -f"
echo " Cấu hình:  ${APP_DIR}/.env   (firmware: ${APP_DIR}/firmware, nội dung: ${APP_DIR}/content)"
echo " Lưu ý: Web Serial cần HTTPS khi mở từ máy khác — xem README-PI.md (Caddy hoặc cờ Chrome)."
echo "======================================================"
