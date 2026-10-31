# DIY IoT Platform — ESP32 · Matter · Thread · Smart Home

Trang web phát hành dự án DIY nhà thông minh với **nạp firmware ngay trên trình duyệt**: cắm bo mạch ESP vào máy tính, chọn firmware, chip được nhận diện tự động và flash — không cần cài phần mềm, **không có file firmware tải về máy**. Giao diện tối giản phong cách iOS, màu sắc nhẹ, có mục ủng hộ qua MoMo, Buy Me a Coffee và ví blockchain.

> Ý tưởng, kiến trúc thông tin và hệ thống thiết kế: xem [`docs/CONCEPT.md`](docs/CONCEPT.md). Cấu trúc mã nguồn: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tính năng

- **Trình flash trong trình duyệt** (Web Serial + [esptool-js](https://github.com/espressif/esptool-js)): nhận diện chip (ESP32, S2, S3, C2, C3, C5, C6, H2, P4, ESP8266), đọc MAC/dung lượng flash, tự chọn bản dựng phù hợp, ghi kèm kiểm tra MD5, khởi động lại thiết bị, nhật ký kỹ thuật, tuỳ chọn baud và xoá toàn bộ flash.
- **Firmware không tải về được**: file nằm ngoài `public/`, chỉ phát qua phiên có chữ ký (hết hạn 10 phút), mã hoá AES‑256‑GCM theo phiên, giải mã trong bộ nhớ trình duyệt ngay trước khi ghi, không cache, chặn truy cập trực tiếp từ thanh địa chỉ/trang khác, giới hạn tần suất.
- **Hướng dẫn sử dụng bên dưới trình flash**: 3 bước, bước sau khi flash theo từng firmware, khắc phục lỗi, bảng trình duyệt hỗ trợ, giải thích cơ chế bảo vệ.
- **Dự án**: linh kiện, tính năng, bài viết markdown, firmware liên quan, lọc theo giao thức/chip.
- **Hướng dẫn**: bài viết markdown theo chủ đề (bắt đầu, flash, phần cứng, Matter, Thread, Home Assistant, khắc phục lỗi).
- **Ủng hộ**: MoMo (QR + số điện thoại), Buy Me a Coffee (nút + QR), ví blockchain (địa chỉ, QR, nút sao chép, cảnh báo mạng).
- Thiết kế iOS tối giản: font hệ thống, nền xám nhạt, thẻ trắng bo góc, thanh điều hướng kính mờ, badge pastel, tôn trọng `prefers-reduced-motion`.

## Chạy thử

```bash
npm install
npm run firmware:demo   # tạo file giữ chỗ cho firmware còn thiếu (KHÔNG boot được, chỉ để thử giao diện)
npm run dev             # http://localhost:3000
```

Mở bằng Chrome/Edge/Opera/Arc trên máy tính (Safari, Firefox và trình duyệt di động chưa hỗ trợ Web Serial). `localhost` được coi là secure context; khi triển khai thật cần HTTPS.

Kiểm tra toàn bộ: `npm run check` (typecheck + lint + build). Smoke test API firmware với server đang chạy: `FW_ID=<id> npm run smoke`.

## Thêm dự án, firmware, hướng dẫn

Không cần cơ sở dữ liệu. Mọi nội dung nằm trong `content/` và được kiểm tra bằng schema (zod) lúc build — file sai sẽ báo lỗi rõ ràng.

### 1. Dự án — `content/projects/<slug>.md`

```md
---
title: "Đèn Matter over Thread với ESP32-C6"
summary: "Một câu mô tả ngắn."
protocol: "Matter over Thread"   # Matter over Thread | Matter over Wi-Fi | Thread | Zigbee | Wi-Fi | BLE | ESP-NOW
chips: ["ESP32-C6", "ESP32-H2"]
difficulty: "easy"               # easy | medium | hard
timeMinutes: 30
features: ["Ghép đôi bằng mã QR Matter", "OTA"]
bom:
  - { name: "ESP32-C6-DevKitC-1", qty: 1 }
firmware: ["matter-light-c6"]    # id của manifest firmware
guides: ["bat-dau"]              # slug hướng dẫn liên quan
tags: ["matter"]
accent: "mint"                   # sky | mint | lavender | peach | lemon | rose | graphite
icon: "💡"
featured: true
updatedAt: "2026-10-31"
---
## Nội dung markdown (GFM)
```

### 2. Firmware — `content/firmware/<id>.json` + file nhị phân trong `firmware/<id>/<version>/`

Cách nhanh nhất với sản phẩm build từ ESP‑IDF / ESP‑Matter:

```bash
npm run firmware:add -- matter-light-c6 1.0.0 ESP32-C6 \
  0x0=build/bootloader/bootloader.bin \
  0x8000=build/partition_table/partition-table.bin \
  0x10000=build/matter-light.bin
```

Lệnh sẽ copy file vào `firmware/matter-light-c6/1.0.0/` và in ra đoạn `builds` để dán vào manifest:

```json
{
  "id": "matter-light-c6",
  "name": "Matter Light",
  "version": "1.0.0",
  "project": "matter-light-c6",
  "summary": "Đèn Matter over Thread cho ESP32-C6.",
  "releasedAt": "2026-10-31",
  "status": "stable",
  "changelog": ["Bản phát hành đầu tiên"],
  "builds": [
    {
      "chipFamily": "ESP32-C6",
      "parts": [
        { "offset": "0x0", "file": "bootloader.bin", "label": "bootloader" },
        { "offset": "0x8000", "file": "partition-table.bin", "label": "partition-table" },
        { "offset": "0x10000", "file": "matter-light.bin", "label": "app" }
      ],
      "flashMode": "keep", "flashFreq": "keep", "flashSize": "keep",
      "eraseAll": false, "baudrate": 460800
    }
  ],
  "afterFlash": ["Mở Apple Home / Google Home và quét mã QR Matter."],
  "tags": ["matter", "thread"],
  "demo": false
}
```

Offset bootloader: ESP32/ESP32‑S2 là `0x1000`; S3/C2/C3/C5/C6/H2/P4 là `0x0`. Một manifest có thể chứa nhiều `builds` cho nhiều chip — trình flash sẽ tự chọn theo chip nhận diện được. Đặt `"demo": true` nếu file chỉ là giữ chỗ (giao diện sẽ hiện badge cảnh báo).

### 3. Hướng dẫn — `content/guides/<slug>.md`

```md
---
title: "Nạp firmware ngay trên trình duyệt"
summary: "Mô tả ngắn."
category: "flash"   # bat-dau | flash | matter | thread | home-assistant | phan-cung | khac-phuc
order: 20
projects: []
updatedAt: "2026-10-31"
---
```

### 4. Thông tin site & kênh ủng hộ — `content/site.json`

Tên trang, mô tả, tác giả, MoMo (`phone`, `accountName`, tuỳ chọn `qrPayload` sao chép từ app MoMo), Buy Me a Coffee (`username`), danh sách ví (`symbol`, `network`, `address`, `uriScheme`), footer.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `FLASH_SECRET` | Production | ≥ 32 byte ngẫu nhiên (hex hoặc base64). Ký token phiên và dẫn xuất khoá AES. Tạo: `openssl rand -hex 32`. Không đặt → mỗi tiến trình tự sinh khoá (chỉ hợp với một instance `next start`). |

## Triển khai

- **Máy chủ Node (VPS, Docker, Railway, Render…)**: `npm run build && npm start`, đặt `FLASH_SECRET`, bật HTTPS (bắt buộc cho Web Serial). Thư mục `firmware/` và `content/` phải có mặt lúc chạy.
- **Vercel / serverless**: `next.config.ts` đã khai báo `outputFileTracingIncludes` để đóng gói `firmware/**` và `content/**` vào hàm API. Giới hạn kích thước bundle của nhà cung cấp áp dụng cho tổng dung lượng firmware.
- Không đưa file firmware vào `public/` hay CDN tĩnh — điều đó sẽ bỏ qua toàn bộ cơ chế bảo vệ.

## Cơ chế bảo vệ firmware và giới hạn

1. `POST /api/flash/session` nhận `{firmwareId, chip}` → kiểm tra same‑origin, rate limit, tìm bản dựng khớp chip → trả token HMAC‑SHA256 (hết hạn 10 phút) và khoá AES‑256‑GCM dẫn xuất bằng HKDF từ `FLASH_SECRET` + nonce phiên.
2. `GET /api/flash/part?t=…&i=…` → xác thực token → mã hoá part với IV ngẫu nhiên, AAD = `nonce:index` → `Cache-Control: no-store`, `Content-Disposition: inline`, từ chối `Sec-Fetch-Dest: document` (dán URL vào thanh địa chỉ) và yêu cầu cross‑site.
3. Trình duyệt giải mã bằng WebCrypto trong bộ nhớ, ghi vào chip, rồi ghi đè buffer bằng 0. Không tạo Blob URL, không có nút tải về.

**Giới hạn trung thực:** trình duyệt bắt buộc phải nhận dữ liệu để nạp, nên người dùng có kỹ năng vẫn có thể trích xuất bằng DevTools. Cơ chế trên ngăn tải về “tiện tay”, hotlink và thu thập hàng loạt; bảo vệ thực sự cho firmware nhạy cảm là **Flash Encryption + Secure Boot** trên chip ESP32.

## Kiểm thử

- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run smoke` — kiểm tra API firmware (token, mã hoá, chặn truy cập trực tiếp) với server đang chạy
- `npm run test:e2e` — mô phỏng thiết bị ESP32‑C6 trong trình duyệt và chạy toàn bộ luồng flash qua giao diện thật (Playwright)

## Giấy phép

Mã nguồn: MIT. Nội dung bài viết: theo ghi chú trong `content/site.json`.
