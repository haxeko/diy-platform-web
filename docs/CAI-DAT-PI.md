# Cài đặt MachNha trên Raspberry Pi 3 — hướng dẫn từng bước

Tài liệu này đi từ thẻ nhớ trống đến trang web chạy ổn định, tự khởi động cùng Pi. Mỗi bước có lệnh sẵn, chỉ cần dán vào.

> **Sơ đồ:** Máy tính (build + đóng gói) → chép gói qua SSH → Pi (cài đặt, chạy dịch vụ) → mở trang từ máy tính qua HTTPS để nạp firmware.

**Chuẩn bị**

| Thứ cần có | Ghi chú |
| --- | --- |
| Raspberry Pi 3 / 3B+ (hoặc 4, 5) | 1 GB RAM là đủ |
| Thẻ microSD ≥ 8 GB (A1/A2) + đầu đọc | Hoặc USB SSD nếu muốn bền hơn |
| Nguồn 5 V ≥ 2,5 A | Nguồn yếu gây treo ngẫu nhiên |
| Mạng: dây LAN hoặc Wi‑Fi 2,4 GHz | Pi 3 chỉ có Wi‑Fi 2,4 GHz |
| Máy tính Windows/macOS/Linux | Có Node.js ≥ 20 để build; có trình duyệt Chrome/Edge để nạp firmware |

---

## Bước 1 — Ghi Raspberry Pi OS Lite 64‑bit vào thẻ nhớ

1. Tải và mở **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. *Choose Device* → Raspberry Pi 3.
3. *Choose OS* → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64‑bit)**. Bắt buộc bản 64‑bit.
4. *Choose Storage* → chọn thẻ nhớ.
5. Nhấn **Next** → **Edit Settings** (tuỳ chỉnh OS) và điền:
   - **Hostname:** `machnha` (trang sẽ có địa chỉ `machnha.local`)
   - **Username / Password:** ví dụ `pi` / mật khẩu mạnh
   - **Wi‑Fi:** SSID, mật khẩu, quốc gia `VN` (bỏ qua nếu dùng dây LAN)
   - **Locale:** múi giờ `Asia/Ho_Chi_Minh`, bàn phím `us`
   - Tab **Services:** bật **Enable SSH** → *Use password authentication*
6. **Save** → **Yes** → chờ ghi và xác minh xong, rút thẻ.

## Bước 2 — Khởi động Pi lần đầu và vào SSH

1. Cắm thẻ, cắm mạng (nếu dùng dây), cắm nguồn. Chờ khoảng 1–2 phút cho lần boot đầu (Pi tự mở rộng phân vùng và khởi động lại một lần).
2. Trên máy tính mở Terminal (Windows: PowerShell hoặc Windows Terminal) và kết nối:

```bash
ssh pi@machnha.local
```

Nếu `machnha.local` không phân giải được (một số router/Windows cũ), tìm IP của Pi trong trang quản trị router hoặc dùng app *Fing*, rồi `ssh pi@192.168.x.x`. Gõ `yes` khi được hỏi về fingerprint, nhập mật khẩu.

3. Cập nhật hệ thống và cài vài tiện ích:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y curl ca-certificates xz-utils avahi-daemon
sudo reboot
```

Đợi 1 phút rồi SSH lại.

## Bước 3 — Build và đóng gói trên máy tính

Pi 3 build rất chậm và dễ hết RAM, nên build ở máy tính (gói là JavaScript thuần, build trên máy x86‑64 vẫn chạy trên Pi ARM64).

```bash
git clone <địa-chỉ-repo> diy-platform-web
cd diy-platform-web
npm install
npm run package:pi
```

Kết quả: `dist/machnha-pi-<phiên bản>-<ngày>.tar.gz` (khoảng 5 MB).

Trước khi đóng gói nên:

- Điền `content/site.json`: tên, số MoMo, tên tài khoản, username Buy Me a Coffee, địa chỉ ví.
- Thêm firmware thật (nếu đã có): `npm run firmware:add -- <id> <version> <chip> 0x0=bootloader.bin 0x8000=partition-table.bin 0x10000=app.bin` rồi đặt `"demo": false` trong manifest.
- Chạy `npm run check` để chắc chắn mọi thứ hợp lệ.

## Bước 4 — Chép gói sang Pi

```bash
scp dist/machnha-pi-*.tar.gz pi@machnha.local:~/
```

Windows PowerShell dùng cùng lệnh `scp` (có sẵn từ Windows 10). Hoặc dùng WinSCP/FileZilla kéo thả vào thư mục `/home/pi`.

## Bước 5 — Cài đặt trên Pi

```bash
ssh pi@machnha.local
tar -xzf machnha-pi-*.tar.gz
cd machnha-pi
sudo ./install-pi.sh --with-caddy
```

Script làm gì (khoảng 2–4 phút trên Pi 3, phần lớn là tải Node.js ~45 MB):

| Việc | Kết quả |
| --- | --- |
| Tải Node.js 22 bản `linux-arm64` vào `/usr/local` | `node --version` → v22.x |
| Tạo người dùng hệ thống `machnha`, chép ứng dụng vào `/opt/machnha` | Bản cũ (nếu có) sao lưu sang `/opt/machnha.bak-…` |
| Sinh `FLASH_SECRET` ngẫu nhiên vào `/opt/machnha/.env` | Chỉ sinh lần đầu, lần sau giữ nguyên |
| Cài dịch vụ systemd `machnha` | Tự chạy khi khởi động, tự khởi động lại khi lỗi, giới hạn RAM 600 MB |
| Cài Caddy, cấp chứng chỉ HTTPS nội bộ cho `machnha.local` và IP của Pi | `https://machnha.local` |

Cuối script sẽ in địa chỉ truy cập và đường dẫn chứng chỉ gốc.

Kiểm tra nhanh ngay trên Pi:

```bash
sudo systemctl status machnha --no-pager     # active (running)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
sudo systemctl status caddy --no-pager
```

## Bước 6 — Tin chứng chỉ HTTPS trên máy tính (một lần cho mỗi máy)

Web Serial chỉ hoạt động trên trang HTTPS (hoặc `localhost`). Pi không có màn hình, bạn sẽ mở trang từ máy tính khác, nên cần HTTPS.

1. Tải chứng chỉ gốc của Caddy về máy tính:

```bash
scp pi@machnha.local:/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt ~/machnha-root.crt
```

Nếu báo *Permission denied*, chạy trên Pi `sudo cp /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt ~/root.crt && sudo chown pi ~/root.crt` rồi `scp pi@machnha.local:~/root.crt ~/machnha-root.crt`.

2. Cài vào kho tin cậy:
   - **Windows:** nhấp đúp file → *Install Certificate* → *Local Machine* → *Place all certificates in the following store* → *Trusted Root Certification Authorities* → Finish.
   - **macOS:** mở bằng *Keychain Access* → kéo vào *System* → nhấp đúp chứng chỉ → *Trust* → *When using this certificate: Always Trust*.
   - **Linux (Chrome/Edge):** `chrome://settings/certificates` → *Authorities* → *Import* → tích *Trust this certificate for identifying websites*.
3. Khởi động lại trình duyệt, mở **https://machnha.local**. Ổ khoá phải xanh, không cảnh báo.

Cách nhanh thay thế (chỉ cho máy đang dùng, không cần chứng chỉ): Chrome/Edge → `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → nhập `http://machnha.local:3000` → *Enabled* → *Relaunch*.

## Bước 7 — Nạp thử firmware

1. Trên máy tính mở `https://machnha.local/firmware` bằng Chrome/Edge.
2. Cắm board ESP32 vào **máy tính** (không phải Pi) bằng cáp USB có dữ liệu.
3. Chọn firmware → **Kết nối thiết bị** → chọn cổng trong hộp thoại → thấy chip và *Tương thích* → **Nạp firmware**.
4. Sau khi xong, **Mở Serial Monitor** để lấy mã QR ghép nối Matter.

Nếu gói còn firmware demo, giao diện hiện badge *Bản demo*; thiết bị sẽ không chạy được với file demo — đây là bước thử luồng, không phải firmware thật.

## Bước 8 — Vận hành hằng ngày

```bash
journalctl -u machnha -f                 # xem nhật ký trực tiếp
sudo systemctl restart machnha           # khởi động lại ứng dụng
sudo nano /opt/machnha/.env              # đổi cổng, tắt demo (xoá ALLOW_DEMO_FIRMWARE=1)…
sudo systemctl reload caddy              # sau khi sửa /etc/caddy/Caddyfile
```

**Cập nhật phiên bản mới:** trên máy tính `npm run package:pi` → `scp` → trên Pi giải nén và `sudo ./install-pi.sh --with-caddy`. `.env` giữ nguyên, bản cũ nằm ở `/opt/machnha.bak-…` (xoá khi không cần: `sudo rm -rf /opt/machnha.bak-*`).

**Sao lưu:** chỉ cần giữ repo (nội dung, firmware) và file `/opt/machnha/.env` (chứa `FLASH_SECRET`, `FIRMWARE_MASTER_KEY`). Cài lại từ đầu mất 10 phút.

**Thêm firmware/nội dung:** làm trong repo rồi đóng gói lại. Các trang dự án/hướng dẫn được render sẵn lúc build nên sửa trực tiếp trên Pi sẽ không đổi giao diện.

## Khắc phục sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
| --- | --- |
| `install-pi.sh` báo `armv7l` | Đã ghi OS 32‑bit. Ghi lại thẻ với **Lite (64‑bit)**. |
| `ssh: Could not resolve machnha.local` | mDNS chưa chạy; dùng IP (xem trên router) hoặc cài Bonjour (Windows cũ). Trên Pi: `sudo systemctl enable --now avahi-daemon`. |
| Dịch vụ `failed` | `journalctl -u machnha -n 50`. Thường do `.env` thiếu `FLASH_SECRET` hoặc cổng 3000 bận (`sudo ss -ltnp | grep 3000`). |
| Trang mở được nhưng nút *Kết nối thiết bị* mờ | Chưa HTTPS hoặc chưa tin chứng chỉ → Bước 6. Safari/Firefox không hỗ trợ Web Serial. |
| Không thấy cổng USB trong hộp thoại | Cáp chỉ sạc; cắm board vào máy tính; cài driver CP210x/CH340 nếu board dùng chip USB‑UART rời. |
| Chậm, `journalctl` báo out of memory | Bật swap: `sudo dphys-swapfile swapoff && sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=512/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon`. |
| Muốn gỡ sạch | `sudo systemctl disable --now machnha caddy; sudo rm -rf /opt/machnha /etc/systemd/system/machnha.service; sudo systemctl daemon-reload` |

---

## Phụ lục — Tạo ảnh SD cài sẵn bằng HashiCorp Packer

Nếu muốn cách làm "ghi thẻ là chạy" cho nhiều Pi (không cần Bước 2–5 trên từng máy), thư mục `packer/` trong repo chứa mẫu dùng plugin `arm-image` để nhúng gói MachNha vào ảnh Raspberry Pi OS Lite 64‑bit. Chạy trên máy Linux x86‑64 (hoặc WSL2) có quyền root:

```bash
sudo apt install -y qemu-user-static binfmt-support kpartx   # Ubuntu/Debian
packer init packer/
npm run package:pi
sudo packer build -var "bundle_dir=dist/machnha-pi" packer/
# → packer/output/machnha-pi.img → ghi bằng Raspberry Pi Imager (Use custom)
```

Ảnh tạo ra có Node.js, ứng dụng ở `/opt/machnha`, dịch vụ systemd đã bật; `FLASH_SECRET` được sinh ở lần boot đầu (dịch vụ `machnha-firstboot`). Wi‑Fi/SSH/người dùng vẫn thiết lập qua Imager như Bước 1. Caddy HTTPS cài sau bằng `sudo /opt/machnha/install-pi.sh --with-caddy` hoặc đặt `install_caddy=true` khi build. Mẫu này chưa được chạy thử trong phiên tạo tài liệu — xem `packer/README.md` để biết chi tiết và cách sửa.
