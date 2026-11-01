# Kiến trúc mã nguồn

Next.js 16 (App Router, TypeScript, React 19) + Tailwind CSS v4. Không cần cơ sở dữ liệu: nội dung nằm trong `content/`, firmware nằm trong `firmware/` (ngoài `public/`).

```
content/
  site.json              # tên site, tác giả, kênh ủng hộ (MoMo, Buy Me a Coffee, ví crypto), footer
  projects/<slug>.md     # frontmatter (ProjectFrontmatterSchema) + markdown GFM
  firmware/<id>.json     # manifest firmware (FirmwareManifestSchema): builds theo chipFamily, parts {offset,file,sha256?}
  guides/<slug>.md       # frontmatter (GuideFrontmatterSchema) + markdown
firmware/<id>/<version>/<file>.bin[.enc]   # binary thật (tuỳ chọn mã hoá at-rest), chỉ phát qua API có token
scripts/
  firmware-add.mjs       # copy bin thật vào kho (+ mã hoá at-rest nếu có FIRMWARE_MASTER_KEY), in snippet manifest kèm sha256
  firmware-make-demo.mjs # tạo file giữ chỗ cho manifest demo:true (không boot được)
  content-check.mjs      # kiểm tra liên kết nội bộ và tham chiếu dự án ↔ firmware ↔ hướng dẫn
  smoke-flash-api.mjs    # kiểm thử API firmware với server đang chạy
tests/e2e/
  fake-esp-serial.js     # thiết bị ESP32-C6/ESP32 giả lập trong trình duyệt (giao thức ROM bootloader + stub)
  flash.e2e.mjs          # Playwright: luồng nạp thật qua giao diện, đối chiếu bytes trong flash ảo
src/
  app/
    layout.tsx           # NavBar + Footer, metadata từ site.json, kiểm tra nhất quán nội dung
    page.tsx             # trang chủ
    du-an/               # danh sách + chi tiết dự án
    firmware/            # trình nạp (tất cả firmware) + chi tiết từng firmware (hướng dẫn sử dụng bên dưới)
    huong-dan/           # hướng dẫn
    ung-ho/              # ủng hộ
    bao-ve-firmware/     # cơ chế bảo vệ firmware và giới hạn thật
    robots.ts, sitemap.ts
    api/flash/session    # POST: cấp token phiên + khoá AES-GCM cho đúng 1 bản dựng khớp chip
    api/flash/part       # GET (Authorization: Bearer): phát 1 part đã mã hoá, mỗi part một lần/phiên, no-store
  components/
    ui/                  # primitives: Button, Card, Badge, Callout, ProgressBar, StepList, GroupedList, SegmentedControl, CopyButton, QrCode (server), ClientQr, Icons, Container, PageHeader, SectionHeader
    layout/              # NavBar (client), Footer, nav-items
    flasher/             # Flasher (client, máy trạng thái 2 bước) + FirmwarePicker, ChipCard, LogConsole, SerialMonitor, MatterPairingCard, strings
    firmware/            # FlashGuide: hướng dẫn sử dụng hiển thị dưới trình nạp
    projects/, guides/, home/, support/
    content/Markdown.tsx # render markdown (react-markdown + remark-gfm) với class .prose-ios
  lib/
    content/schema.ts    # zod schema + types (ChipFamily, Protocol, Difficulty, Accent, Project, FirmwareManifest, Guide)
    content/load.ts      # server-only: getProjects/getProject/getFirmwareManifests/getFirmware/getGuides/getGuide
    content/site.ts      # server-only: getSiteConfig()
    content/validate.ts  # server-only: assertContentIntegrity() — tham chiếu chéo
    flash/shared.ts      # types dùng chung client/server, normalizeChipName, findBuildForChip, FirmwarePublic
    flash/server/*       # crypto (HMAC token, HKDF, AES-GCM, at-rest MNFE), store (đọc file an toàn, sha256), guard (same-origin, rate limit, sổ cái single-use, bearer), public
    flash/client/*       # engine (esptool-js + Web Serial, Serial Monitor), errors (thông báo tiếng Việt), useFlasher (hook)
    format.ts, cn.ts
```

## Luồng nạp (hai bước)

1. **Kết nối thiết bị** → `navigator.serial.requestPort()` → `ESPLoader.main()` (reset vào bootloader, nhận diện chip, nạp stub, đổi baud; tự thử lại ở 115200 nếu không kết nối được) → đọc `chip.CHIP_NAME`, mô tả, MAC, dung lượng flash, VID/PID cầu USB.
2. Engine đối chiếu `CHIP_NAME` với `chips` của firmware và `minFlashMB` → trạng thái `detected` (hoặc `incompatible`, khi đó board được reset và cổng đóng lại).
3. Người dùng chọn chế độ **Cập nhật** (giữ dữ liệu) hoặc **Cài mới** (xoá toàn bộ, cần xác nhận) rồi nhấn **Nạp firmware {chip}**.
4. `POST /api/flash/session {firmwareId, chip}` → token HMAC (hết hạn 10 phút) + khoá AES-256-GCM dẫn xuất bằng HKDF từ `FLASH_SECRET` và nonce phiên; kiểm tra `offset + size ≤ flash phát hiện`.
5. Với mỗi part: `GET /api/flash/part?i=<n>` với `Authorization: Bearer <token>` → giải mã bằng WebCrypto trong bộ nhớ (AAD = `nonce:index`). Phiên hết hạn/đã dùng (410) → tự xin phiên mới một lần.
6. `writeFlash` (nén + MD5, báo tiến độ) → reset cứng (DTR thấp, xung RTS) → ngắt kết nối → xoá buffer. `beforeunload` chặn rời trang khi đang ghi.
7. Tuỳ chọn **Serial Monitor** (115200): reset board, đọc log khởi động, bắt `MT:…` và “Manual pairing code” → thẻ **Mã ghép nối Matter** (QR + mã thủ công). Không có thì dùng `pairing` trong manifest.

## Quy ước giao diện (iOS tối giản)

- Token màu trong `src/app/globals.css` (`@theme`): `bg`, `surface`, `label`, `label-2/3/4`, `separator`, `fill`, `tint`, `tint-soft`, `success/warning/danger(-soft)`, pastel `sky/mint/lavender/peach/lemon/rose/graphite(-soft)`.
- Bo góc: `rounded-card` (20px), `rounded-card-lg` (28px, panel trình nạp), `rounded-control` (12px), pill. Bóng: `shadow-card`. Kính mờ: `glass`.
- Chữ: `title-large`, `title-1`, `title-2`, `eyebrow`. Font hệ thống (SF Pro / Segoe UI / Roboto).
- Thành phần dùng `src/components/ui/*`; không thêm thư viện UI. Mọi chuỗi hiển thị bằng tiếng Việt; thuật ngữ kỹ thuật giữ nguyên.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `FLASH_SECRET` | Production | ≥ 32 byte (hex/base64). Ký token phiên, dẫn xuất khoá AES. Thiếu ở production → API ném lỗi ngay. |
| `FIRMWARE_MASTER_KEY` | Khi có file `.enc` | ≥ 32 byte. Giải mã firmware lưu at-rest (định dạng MNFE v1, AES-256-GCM, AAD = `id/version/file`). |
| `ALLOW_DEMO_FIRMWARE` | Không | `1` để cho phép phát manifest `demo: true` ở production (mặc định chặn 403). |
