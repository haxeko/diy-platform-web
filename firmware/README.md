# Kho firmware (không public)

Thư mục này **không** nằm trong `public/`, nên Next.js không bao giờ phục vụ file ở đây dưới dạng tĩnh.
Firmware chỉ được phát qua `/api/flash/part` với token phiên ngắn hạn và mã hoá AES‑GCM, rồi được giải mã
trong bộ nhớ trình duyệt ngay trước khi ghi vào chip.

Cấu trúc:

```
firmware/<firmware-id>/<version>/<file>.bin
```

- `<firmware-id>` và `<version>` phải trùng với manifest `content/firmware/<firmware-id>.json`.
- Thêm firmware thật: `npm run firmware:add -- <id> <version> <chipFamily> 0x0=bootloader.bin 0x8000=partition-table.bin 0x10000=app.bin`
- Tạo file giữ chỗ để chạy thử giao diện: `npm run firmware:demo` (file demo **không** boot được).
