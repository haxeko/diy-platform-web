#!/usr/bin/env bash
# Runs inside the chrooted Raspberry Pi OS image (qemu-user). Installs Node.js, MachNha and
# the systemd units. Secrets are generated on first boot, never baked into the image.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

NODE_VERSION="${NODE_VERSION:-22.20.0}"
APP_DIR=/opt/machnha
BUNDLE=/opt/machnha-bundle

apt-get update -qq
apt-get install -y -qq curl ca-certificates xz-utils avahi-daemon >/dev/null

# Node.js (arm64 tarball into /usr/local)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner
  rm -f /tmp/node.tar.xz
fi

# Application files
id -u machnha >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin machnha
mkdir -p "$APP_DIR"
cp -a "$BUNDLE/." "$APP_DIR/"
rm -rf "$BUNDLE"
cp "$APP_DIR/.env.example" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
chown -R machnha:machnha "$APP_DIR"
install -m 0644 "$APP_DIR/machnha.service" /etc/systemd/system/machnha.service

# First-boot unit: generate FLASH_SECRET once, then start the app.
cat > /etc/systemd/system/machnha-firstboot.service <<'UNIT'
[Unit]
Description=MachNha first boot: generate FLASH_SECRET
Before=machnha.service
ConditionPathExists=!/opt/machnha/.firstboot-done

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'S=$(openssl rand -hex 32); sed -i "s|^FLASH_SECRET=.*|FLASH_SECRET=$S|" /opt/machnha/.env; touch /opt/machnha/.firstboot-done'

[Install]
WantedBy=multi-user.target
UNIT

systemctl enable machnha-firstboot.service machnha.service avahi-daemon.service

if [ "${INSTALL_CADDY:-false}" = "true" ]; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
  # Host names are only known at runtime; serve any name on the LAN with the internal CA.
  cat > /etc/caddy/Caddyfile <<'CADDY'
https:// {
	tls internal
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
  systemctl enable caddy.service
fi

apt-get clean
echo "MachNha image provisioned (node $(node --version))."
