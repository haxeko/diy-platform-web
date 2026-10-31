# Kiến trúc mã nguồn

Next.js 16 (App Router, TypeScript, React 19) + Tailwind CSS v4. Không cần cơ sở dữ liệu: nội dung nằm trong `content/`, firmware nằm trong `firmware/` (ngoài `public/`).

```
content/
  site.json              # tên site, tác giả, kênh ủng hộ (MoMo, Buy Me a Coffee, ví crypto), footer
  projects/<slug>.md     # frontmatter (ProjectFrontmatterSchema) + markdown GFM
  firmware/<id>.json     # manifest firmware (FirmwareManifestSchema): builds theo chipFamily, parts {offset,file}
  guides/<slug>.md       # frontmatter (GuideFrontmatterSchema) + markdown
firmware/<id>/<version>/<file>.bin   # binary thật, chỉ phát qua API có token
scripts/
  firmware-add.mjs       # copy bin thật vào kho + in snippet manifest
  firmware-make-demo.mjs # tạo file giữ chỗ cho mọi part còn thiếu (không boot được)
  smoke-flash-api.mjs    # kiểm thử API firmware với server đang chạy
src/
  app/
    layout.tsx           # NavBar + Footer, metadata từ site.json
    page.tsx             # trang chủ
    projects/            # danh sách + chi tiết dự án
    firmware/            # trình flash (tất cả firmware) + chi tiết từng firmware (hướng dẫn bên dưới)
    guides/              # hướng dẫn
    support/             # ủng hộ
    api/flash/session    # POST: cấp token phiên + khoá AES-GCM cho đúng 1 bản dựng khớp chip
    api/flash/part       # GET: phát 1 part đã mã hoá (IV||ciphertext||tag), no-store, chặn truy cập trực tiếp
  components/
    ui/                  # primitives: Button, Card, Badge, Callout, ProgressBar, StepList, GroupedList, SegmentedControl, CopyButton, QrCode, Icons, Container, PageHeader, SectionHeader
    layout/              # NavBar (client), Footer, nav-items
    flasher/             # Flasher (client) + FirmwarePicker, ChipCard, LogConsole, strings
    firmware/            # FlashGuide: hướng dẫn sử dụng hiển thị dưới trình flash
    content/Markdown.tsx # render markdown (react-markdown + remark-gfm) với class .prose-ios
  lib/
    content/schema.ts    # zod schema + types (ChipFamily, Protocol, Difficulty, Accent, Project, FirmwareManifest, Guide)
    content/load.ts      # server-only: getProjects/getProject/getFirmwareManifests/getFirmware/getGuides/getGuide
    content/site.ts      # server-only: getSiteConfig()
    flash/shared.ts      # types dùng chung client/server, findBuildForChip, FirmwarePublic
    flash/server/*       # crypto (HMAC token, HKDF, AES-GCM), store (đọc file an toàn), guard (same-origin, rate limit), public (manifest → FirmwarePublic)
    flash/client/*       # engine (esptool-js + Web Serial), errors (thông báo tiếng Việt), useFlasher (hook)
    format.ts, cn.ts
```

## Luồng flash

1. Người dùng chọn firmware và nhấn **Kết nối & Flash** → `navigator.serial.requestPort()`.
2. `ESPLoader.main()` (esptool-js) reset vào bootloader, nhận diện chip, nạp stub, đổi baud.
3. Engine đối chiếu chip với `chips` của firmware; không khớp → trạng thái `incompatible`.
4. `POST /api/flash/session {firmwareId, chip}` → token HMAC (hết hạn 10 phút) + khoá AES-256-GCM dẫn xuất bằng HKDF từ `FLASH_SECRET` và nonce phiên.
5. Với mỗi part: `GET /api/flash/part?t=<token>&i=<n>` → giải mã bằng WebCrypto trong bộ nhớ (AAD = `nonce:index`).
6. `writeFlash` với nén + kiểm tra MD5, báo tiến độ → `after("hard_reset")` → ngắt kết nối → xoá buffer.

## Quy ước giao diện (iOS tối giản)

- Token màu trong `src/app/globals.css` (`@theme`): `bg`, `surface`, `label`, `label-2/3/4`, `separator`, `fill`, `tint`, `tint-soft`, `success/warning/danger(-soft)`, pastel `sky/mint/lavender/peach/lemon/rose/graphite(-soft)`.
- Bo góc: `rounded-card` (20px), `rounded-control` (12px), pill. Bóng: `shadow-card`. Kính mờ: `glass`.
- Chữ: `title-large`, `title-1`, `title-2`, `eyebrow`. Font hệ thống (SF Pro / Segoe UI / Roboto).
- Thành phần dùng `src/components/ui/*`; không thêm thư viện UI.
- Mọi chuỗi hiển thị bằng tiếng Việt; thuật ngữ kỹ thuật (Matter, Thread, firmware, flash) giữ nguyên.

## Biến môi trường

- `FLASH_SECRET` (bắt buộc ở production): ≥ 32 byte, hex hoặc base64. Dùng để ký token và dẫn xuất khoá phiên.
