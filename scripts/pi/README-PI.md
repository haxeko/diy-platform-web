# Chạy MachNha trên Raspberry Pi 3 (Raspberry Pi OS Lite 64‑bit)

Pi 3 có 1 GB RAM và thẻ SD chậm nên **không build trên Pi**. Quy trình: build và đóng gói trên máy tính → chép gói sang Pi → chạy script cài đặt. Gói là JavaScript thuần (Next.js standalone, không module native) nên build trên máy x86‑64 chạy được trên ARM64.

## Yêu cầu

- Raspberry Pi 3 / 3B+ (hoặc 4, 5) chạy **Raspberry Pi OS Lite 64‑bit** (Bookworm), đã nối mạng, SSH bật.
- Máy tính có Node.js ≥ 20 và `npm` để build (Windows dùng WSL/Git Bash, macOS/Linux dùng Terminal).

## Bước 1 — Đóng gói trên máy tính

```bash
git clone <repo> && cd diy-platform-web
npm run package:pi
# → dist/machnha-pi-<version>-<ngày>.tar.gz (khoảng 5–6 MB, giải nén ~35 MB)
```

Trước khi đóng gói, hãy điền `content/site.json` (MoMo, ví, Buy Me a Coffee), thêm firmware thật (`npm run firmware:add …`, đặt `"demo": false`) nếu đã có. Gói mặc định chứa firmware **demo** (không boot được) để chạy thử giao diện.

## Bước 2 — Chép sang Pi

```bash
scp dist/machnha-pi-*.tar.gz pi@raspberrypi.local:~/
```

(Thay `pi@raspberrypi.local` bằng tên người dùng/địa chỉ IP của Pi.)

## Bước 3 — Cài đặt trên Pi

```bash
ssh pi@raspberrypi.local
tar -xzf machnha-pi-*.tar.gz && cd machnha-pi
sudo ./install-pi.sh                 # chỉ HTTP, cổng 3000
# hoặc
sudo ./install-pi.sh --with-caddy    # thêm Caddy phục vụ HTTPS (khuyến nghị, xem Bước 4)
```

Script sẽ:

1. Tải Node.js 22 (arm64) vào `/usr/local` nếu Pi chưa có Node ≥ 20.
2. Tạo người dùng hệ thống `machnha`, chép ứng dụng vào `/opt/machnha` (bản cũ được sao lưu sang `/opt/machnha.bak-<thời gian>`, giữ nguyên `.env`).
3. Sinh `FLASH_SECRET` ngẫu nhiên vào `/opt/machnha/.env` (chỉ sinh lần đầu).
4. Cài và bật dịch vụ systemd `machnha` (tự chạy khi khởi động, tự khởi động lại khi lỗi, giới hạn RAM 600 MB).
5. (Tuỳ chọn) cài Caddy và cấu hình HTTPS bằng chứng chỉ nội bộ.

Lệnh hữu ích:

```bash
sudo systemctl status machnha        # trạng thái
journalctl -u machnha -f             # nhật ký
sudo systemctl restart machnha       # khởi động lại
sudo nano /opt/machnha/.env          # cấu hình (FLASH_SECRET, PORT, ALLOW_DEMO_FIRMWARE…)
```

## Bước 4 — HTTPS để nạp firmware từ máy khác (quan trọng)

Trình duyệt chỉ cho phép **Web Serial** trên *secure context*: `https://…` hoặc `http://localhost`. Pi OS Lite không có màn hình, bạn sẽ mở trang từ máy tính khác trong mạng, nên `http://raspberrypi.local:3000` **sẽ không cho kết nối cổng USB** (nút Kết nối thiết bị báo trình duyệt chưa hỗ trợ). Chọn một trong các cách sau:

### Cách A — Caddy với chứng chỉ nội bộ (khuyến nghị)

Cài với `--with-caddy`. Caddy tạo một CA cục bộ và cấp chứng chỉ cho `<tên-pi>.local` và địa chỉ IP của Pi. Mỗi máy tính cần tin chứng chỉ gốc **một lần**:

```bash
# trên máy tính
scp pi@raspberrypi.local:/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt ~/machnha-root.crt
```

- **Windows**: nhấp đúp `machnha-root.crt` → Install Certificate → Local Machine → “Place all certificates in the following store” → *Trusted Root Certification Authorities*.
- **macOS**: mở bằng Keychain Access → kéo vào *System* → nhấp đúp chứng chỉ → Trust → *Always Trust*.
- **Linux (Chrome)**: `chrome://settings/certificates` → Authorities → Import → tích “Trust this certificate for identifying websites”.

Sau đó mở `https://raspberrypi.local` (không cần cổng). Muốn đổi tên miền/IP: sửa `/etc/caddy/Caddyfile` rồi `sudo systemctl reload caddy`.

### Cách B — Cờ Chrome (nhanh, chỉ cho máy đang dùng)

Trên Chrome/Edge của máy tính: mở `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, nhập `http://raspberrypi.local:3000` (hoặc `http://<IP>:3000`), chọn **Enabled**, khởi động lại trình duyệt. Trang HTTP khi đó được coi là an toàn và Web Serial hoạt động.

### Cách C — Tên miền thật

Nếu Pi có tên miền công khai (Cloudflare Tunnel, Tailscale `tailscale cert`, DuckDNS + Let’s Encrypt), trỏ Caddy tới tên miền đó: trong `/etc/caddy/Caddyfile` thay dòng host bằng tên miền và bỏ `tls internal`.

## Cập nhật phiên bản mới

Trên máy tính chạy lại `npm run package:pi`, chép gói sang Pi, giải nén và chạy `sudo ./install-pi.sh` (thêm `--with-caddy` nếu dùng Caddy). `.env` được giữ nguyên, bản cũ nằm ở `/opt/machnha.bak-…` (xoá khi không cần).

## Thêm firmware và nội dung

Các trang dự án, hướng dẫn và chi tiết firmware được **render sẵn lúc build**, vì vậy hãy sửa trong repo trên máy tính rồi đóng gói lại. Chỉ sửa trực tiếp trên Pi (`/opt/machnha/content`, `/opt/machnha/firmware`, rồi `sudo systemctl restart machnha`) khi cần thay file nhị phân khẩn cấp: API phát firmware đọc file lúc chạy, nhưng tên/mô tả trên trang sẽ không đổi cho tới khi build lại.

Khi đã có firmware thật, xoá dòng `ALLOW_DEMO_FIRMWARE=1` trong `/opt/machnha/.env` để production từ chối mọi manifest còn gắn `"demo": true`.

## Lưu ý hiệu năng trên Pi 3

- Lần mở trang đầu tiên mất vài giây (Node khởi động); sau đó mượt vì các trang đã prerender.
- `NODE_OPTIONS=--max-old-space-size=384` và `MemoryMax=600M` giữ ứng dụng trong 1 GB RAM. Nếu Pi còn chạy dịch vụ nặng khác (Home Assistant, Docker), cân nhắc Pi 4.
- Dùng thẻ SD tốc độ A1/A2 hoặc USB SSD; bật swap 512 MB nếu thấy “out of memory” trong `journalctl`.
- Tên `raspberrypi.local` cần mDNS: Pi OS đã có avahi; Windows 10+/macOS hỗ trợ sẵn. Không phân giải được thì dùng IP (`hostname -I` trên Pi).

## Khắc phục

| Hiện tượng | Cách xử lý |
| --- | --- |
| `install-pi.sh` báo armv7l | Bạn đang dùng OS 32‑bit. Cài lại Raspberry Pi OS Lite **64‑bit**. |
| Dịch vụ không chạy | `journalctl -u machnha -n 50`; kiểm tra `FLASH_SECRET` trong `.env` (phải ≥ 64 ký tự hex). |
| Cổng 3000 bận | Đổi `PORT=` trong `.env` (và Caddyfile nếu dùng), `sudo systemctl restart machnha`. |
| Nút Kết nối thiết bị bị mờ / báo không hỗ trợ | Trang chưa chạy qua HTTPS — xem Bước 4. |
| Không thấy cổng USB trong hộp thoại | Cáp USB phải truyền dữ liệu; board cắm vào **máy tính đang mở trình duyệt**, không phải vào Pi. |
| Muốn gỡ | `sudo systemctl disable --now machnha && sudo rm -rf /opt/machnha /etc/systemd/system/machnha.service && sudo systemctl daemon-reload` |
