# MachNha — ESP32 · Matter · Thread · Smart Home DIY

Trang web phát hành dự án DIY nhà thông minh với **nạp firmware ngay trên trình duyệt**: cắm board ESP vào máy tính, chọn firmware, chip được nhận diện tự động và nạp — không cần cài phần mềm, **không có file firmware tải về máy**. Giao diện tối giản phong cách iOS, màu sắc nhẹ, có mục ủng hộ qua MoMo, Buy Me a Coffee và ví blockchain.

> Ý tưởng, kiến trúc thông tin và hệ thống thiết kế: xem [`docs/CONCEPT.md`](docs/CONCEPT.md). Cấu trúc mã nguồn: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tính năng

- **Trình nạp trong trình duyệt** (Web Serial + [esptool-js](https://github.com/espressif/esptool-js) 0.7): luồng hai bước *Kết nối thiết bị → Nạp firmware {chip}*; nhận diện chip (ESP32, S2, S3, C2, C3, C5, C6, H2, P4, ESP8266…), đọc MAC/dung lượng flash/cầu USB, tự chọn bản dựng, kiểm tra dung lượng flash, chế độ **Cập nhật** (giữ Wi‑Fi/ghép nối) hoặc **Cài mới** (xoá toàn bộ, có xác nhận), ghi nén kèm MD5, reset cứng, tự hạ baud khi không kết nối được, nhật ký kỹ thuật, chặn rời trang khi đang ghi.
- **Serial Monitor + mã ghép nối Matter**: sau khi nạp, đọc log khởi động của thiết bị, tự bắt mã QR `MT:…` và mã ghép nối 11 số, hiển thị thành thẻ QR để quét bằng Apple Home / Google Home / Home Assistant.
- **Firmware không tải về được**: file nằm ngoài `public/` (tuỳ chọn mã hoá at-rest), chỉ phát qua phiên có chữ ký (hết hạn 10 phút), token truyền qua header `Authorization`, mỗi phần chỉ phát một lần mỗi phiên, mã hoá AES‑256‑GCM theo phiên, giải mã trong bộ nhớ trình duyệt ngay trước khi ghi, không cache, chặn truy cập trực tiếp từ thanh địa chỉ/trang khác, giới hạn tần suất. Trang `/bao-ve-firmware` nói rõ ngăn được gì và không ngăn được gì.
- **Hướng dẫn sử dụng bên dưới trình nạp**: 3 bước, bước sau khi nạp theo từng firmware, khắc phục lỗi, bảng trình duyệt hỗ trợ, giải thích cơ chế bảo vệ.
- **Dự án** (`/du-an`): 6 dự án mẫu (công tắc Matter over Thread C6, cảm biến nhiệt ẩm chạy pin H2, đèn LED RGBW Matter Wi‑Fi S3, cảm biến cửa C3, ổ cắm đo điện năng C3, Thread Border Router C6) với linh kiện, nối dây, ghép nối theo từng hệ sinh thái, cảnh báo 220 V, lọc theo giao thức/chip.
- **Hướng dẫn** (`/huong-dan`): 7 bài (bắt đầu, nạp qua trình duyệt, driver USB & chế độ boot, khắc phục lỗi, ghép đôi Matter, Thread Border Router, Home Assistant).
- **Ủng hộ** (`/ung-ho`): MoMo (QR + số điện thoại), Buy Me a Coffee (nút + QR), ví blockchain (địa chỉ, QR, nút sao chép, cảnh báo mạng).
- Thiết kế iOS tối giản: font hệ thống, nền xám nhạt, thẻ trắng bo góc, thanh điều hướng kính mờ, badge pastel, tôn trọng `prefers-reduced-motion`.

## Chạy thử

```bash
npm install
npm run firmware:demo   # tạo file giữ chỗ cho firmware còn thiếu (KHÔNG boot được, chỉ để thử giao diện)
npm run dev             # http://localhost:3000
```

Mở bằng Chrome/Edge/Opera/Arc trên máy tính (Safari, Firefox và trình duyệt di động chưa hỗ trợ Web Serial). `localhost` được coi là secure context; khi triển khai thật cần HTTPS.

Kiểm tra toàn bộ: `npm run check` (typecheck + lint + kiểm tra nội dung + build). Với server đang chạy: `npm run smoke` (API firmware) và `BASE_URL=http://localhost:3000 npm run test:e2e` (nạp thật vào thiết bị ESP32‑C6 giả lập bằng Playwright).

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

Lệnh copy file vào `firmware/matter-light-c6/1.0.0/` (mã hoá thành `.enc` nếu đặt `FIRMWARE_MASTER_KEY`, nhờ đó có thể commit firmware vào repo công khai) và in ra đoạn `builds` kèm `sha256` để dán vào manifest:

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
        { "offset": "0x0", "file": "bootloader.bin", "label": "bootloader", "sha256": "…" },
        { "offset": "0x8000", "file": "partition-table.bin", "label": "partition-table", "sha256": "…" },
        { "offset": "0x10000", "file": "matter-light.bin", "label": "app", "sha256": "…" }
      ],
      "flashMode": "keep", "flashFreq": "keep", "flashSize": "keep",
      "eraseAll": false
    }
  ],
  "afterFlash": ["Cấp nguồn lại.", "LED nháy chậm = chờ ghép nối.", "Mở app → Thêm phụ kiện → quét QR trong Serial Monitor.", "Reset: giữ BOOT 10 giây.", "Lỗi thường gặp: …"],
  "tags": ["matter", "thread"],
  "demo": false,
  "license": "Apache-2.0",
  "source": "https://github.com/espressif/esp-matter",
  "minFlashMB": 4,
  "pairing": { "qr": "MT:…", "manualCode": "34970112332" }
}
```

`sha256` (tuỳ chọn) được máy chủ đối chiếu trước khi cấp phiên — sai lệch thì dừng phát hành. `minFlashMB` để trình nạp từ chối board có flash nhỏ hơn. `pairing` là mã ghép nối dự phòng khi thiết bị không in mã lúc khởi động.

Offset bootloader: ESP32/ESP32‑S2 là `0x1000`; S3/C2/C3/C5/C6/H2/P4 là `0x0`. Một manifest có thể chứa nhiều `builds` cho nhiều chip (mỗi chipFamily một lần) — trình nạp tự chọn theo chip nhận diện được. `flashFreq` chỉ nhận `keep`/`80m`/`40m`/`26m`/`20m` (khuyến nghị `keep`). Đặt `"demo": true` nếu file chỉ là giữ chỗ (giao diện hiện badge cảnh báo và production từ chối phát).

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
| `FLASH_SECRET` | Production | ≥ 32 byte ngẫu nhiên (hex hoặc base64). Ký token phiên và dẫn xuất khoá AES. Tạo: `openssl rand -hex 32`. Thiếu ở production → API báo lỗi ngay (fail-fast); ở development tự sinh khoá tạm. |
| `FIRMWARE_MASTER_KEY` | Khi dùng `.enc` | ≥ 32 byte. Khoá chủ giải mã firmware lưu at-rest do `firmware:add` tạo ra. |
| `ALLOW_DEMO_FIRMWARE` | Không | `1` để production vẫn phát manifest `demo: true` (mặc định chặn). |

## Triển khai

- **Máy chủ Node (VPS, Docker, Railway, Render…)** — khuyến nghị cho v1: `npm run build && npm start`, đặt `FLASH_SECRET` (và `FIRMWARE_MASTER_KEY` nếu dùng `.enc`), bật HTTPS (bắt buộc cho Web Serial). Thư mục `firmware/` và `content/` phải có mặt lúc chạy.
- **Vercel / serverless**: `next.config.ts` đã khai báo `outputFileTracingIncludes` để đóng gói `firmware/**` và `content/**` vào hàm API. Sổ cái “mỗi phần phát một lần” và bộ giới hạn tần suất nằm trong bộ nhớ từng instance, nên trên serverless chúng chỉ có hiệu lực theo từng instance; giới hạn kích thước bundle của nhà cung cấp áp dụng cho tổng dung lượng firmware.
- Không đưa file firmware vào `public/` hay CDN tĩnh — điều đó sẽ bỏ qua toàn bộ cơ chế bảo vệ.

### Raspberry Pi (OS Lite 64‑bit)

Build trên máy tính rồi chép gói standalone sang Pi: `npm run package:pi` → `dist/machnha-pi-*.tar.gz` → trên Pi `sudo ./install-pi.sh [--with-caddy]`. Script cài Node 22 arm64, tạo dịch vụ systemd, sinh `FLASH_SECRET`, và tuỳ chọn Caddy HTTPS (bắt buộc để dùng Web Serial từ máy khác trong LAN). Hướng dẫn đầy đủ: [`scripts/pi/README-PI.md`](scripts/pi/README-PI.md).

## Cơ chế bảo vệ firmware và giới hạn

1. `POST /api/flash/session` nhận `{firmwareId, chip}` → kiểm tra same‑origin (Sec‑Fetch‑*), rate limit, tìm bản dựng khớp chip, đối chiếu `sha256` → trả token HMAC‑SHA256 (hết hạn 10 phút) và khoá AES‑256‑GCM dẫn xuất bằng HKDF từ `FLASH_SECRET` + nonce phiên.
2. `GET /api/flash/part?i=…` với `Authorization: Bearer <token>` → xác thực token → mỗi `(phiên, phần)` chỉ phát một lần (410 `token-consumed` lần sau) → mã hoá part với IV ngẫu nhiên, AAD = `nonce:index` → `Cache-Control: no-store`, `Cross-Origin-Resource-Policy: same-origin`, `Content-Disposition: inline`, từ chối `Sec-Fetch-Dest: document` (dán URL vào thanh địa chỉ) và yêu cầu cross‑site.
3. Trình duyệt giải mã bằng WebCrypto trong bộ nhớ, ghi vào chip, rồi ghi đè buffer bằng 0. Không tạo Blob URL, không có nút tải về.
4. Tuỳ chọn: firmware trong repo được mã hoá at-rest (`.enc`, AES‑256‑GCM với `FIRMWARE_MASTER_KEY`), máy chủ giải mã rồi mã hoá lại theo phiên.

**Giới hạn trung thực:** trình duyệt bắt buộc phải nhận dữ liệu để nạp, nên người có kỹ năng vẫn có thể trích xuất bằng DevTools; máy chủ cũng không thể xác minh có board thật phía sau yêu cầu. Cơ chế trên ngăn tải về “tiện tay”, hotlink, curl và thu thập hàng loạt, đồng thời đảm bảo mọi lượt nạp đi qua đúng bản đã phát hành; bảo vệ thực sự cho firmware nhạy cảm là **Flash Encryption + Secure Boot** trên chip ESP32. Chi tiết tại `/bao-ve-firmware`.

## Kiểm thử

- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run content:check` — kiểm tra liên kết nội bộ và tham chiếu dự án ↔ firmware ↔ hướng dẫn
- `npm run smoke` — kiểm tra API firmware (token, mã hoá, phát một lần, chặn truy cập trực tiếp) với server đang chạy
- `npm run test:e2e` — mô phỏng thiết bị ESP32‑C6 (và ESP32 không tương thích) trong trình duyệt, chạy toàn bộ luồng nạp qua giao diện thật bằng Playwright và đối chiếu từng byte trong flash ảo

## Giấy phép

Mã nguồn: MIT. Nội dung bài viết: theo ghi chú trong `content/site.json`.
