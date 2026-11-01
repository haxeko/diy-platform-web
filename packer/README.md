# Ảnh SD cài sẵn MachNha (HashiCorp Packer)

Tạo file `.img` Raspberry Pi OS Lite 64‑bit đã có Node.js, ứng dụng ở `/opt/machnha` và dịch vụ systemd. Ghi thẻ bằng Raspberry Pi Imager (chọn *Use custom*, vẫn đặt hostname/Wi‑Fi/SSH trong *Edit Settings*), cắm vào Pi là chạy.

## Yêu cầu

- Máy Linux x86‑64 (Ubuntu/Debian, hoặc WSL2) với quyền root; `qemu-user-static`, `binfmt-support`, `kpartx`.
- [Packer](https://developer.hashicorp.com/packer/install) ≥ 1.9 và plugin [`arm-image`](https://github.com/solo-io/packer-plugin-arm-image) (tự tải bằng `packer init`).

## Các bước

```bash
sudo apt install -y qemu-user-static binfmt-support kpartx
npm run package:pi                 # tạo dist/machnha-pi
packer init packer/
sudo packer build -var "bundle_dir=dist/machnha-pi" packer/
# tuỳ chọn: -var install_caddy=true  (HTTPS nội bộ cho mọi hostname trong LAN)
```

Kết quả: `packer/output/machnha-pi.img` (~4 GB, nén lại bằng `xz -T0` nếu cần chia sẻ).

## Trong ảnh có gì

- Node.js 22 arm64 tại `/usr/local`, ứng dụng tại `/opt/machnha`, người dùng hệ thống `machnha`.
- `machnha-firstboot.service` sinh `FLASH_SECRET` duy nhất cho từng Pi ở lần boot đầu (khoá không nằm trong ảnh).
- `machnha.service` bật sẵn; `avahi-daemon` để dùng `<hostname>.local`.
- Với `install_caddy=true`: Caddy phục vụ HTTPS bằng CA nội bộ cho mọi tên máy; vẫn cần tin `root.crt` trên máy tính (xem `docs/CAI-DAT-PI.md`, Bước 6).

## Lưu ý

- Mẫu này chưa được chạy thử trong phiên tạo tài liệu (cần root, loop device và qemu binfmt). Nếu `packer build` báo lỗi mount, kiểm tra `kpartx` và chạy với `sudo`.
- Đổi phiên bản Raspberry Pi OS bằng `-var raspios_url=… -var raspios_checksum=file:….sha256`.
- Cập nhật ứng dụng trên Pi đã ghi ảnh: dùng `sudo /opt/machnha/install-pi.sh` với gói mới như cách cài thủ công.
