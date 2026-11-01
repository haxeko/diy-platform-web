# MachNha — Ý tưởng cuối cùng (v1)

**Tagline:** *Cắm board. Chọn firmware. Nạp ngay trên trình duyệt — nhà thông minh tự tay làm.*

MachNha (Mạch Nhà) là "App Store cho firmware nhà thông minh" của maker Việt. Mỗi dự án DIY (ESP32 · Matter · Thread · Home Assistant) là một "app" có trang riêng: icon, tóm tắt, linh kiện mua được ở Việt Nam, sơ đồ nối dây, và một nút **Nạp firmware**. Website chính là trình nạp: không có file .bin để tải, chỉ một luồng duy nhất *cắm board → tự nhận diện chip → chọn đúng bản dựng → nạp qua Web Serial (esptool-js) → đọc hướng dẫn sử dụng ngay bên dưới*.

Khởi điểm là đề xuất thắng (NapLab, bám sát mã nguồn hiện có trong repo), đổi tên thành MachNha, ghép các ý tốt nhất của hai đề xuất còn lại (Serial Monitor + mã QR Matter đọc từ log, hướng dẫn ghép nối theo từng hệ sinh thái, Border Router một con C6, minh bạch chi phí, chống giả mạo ví, hợp đồng tương phản AA) và lấp các khoảng trống mà ba giám khảo chỉ ra (kế hoạch ra binary thật đầu tiên, thứ tự ship, chuyển tiếp điện thoại → máy tính, mẫu hướng dẫn sử dụng, kịch bản workshop, factory reset).

## 1. Mục tiêu v1

1. **Nạp được thật**: ít nhất một firmware Matter over Thread thật (ESP32-C6) nạp thành công từ Chrome, thiết bị hiện trong Apple Home / Google Home / Home Assistant.
2. **Dễ hiểu trong 5 giây**: hero 3 bước, 4 mục điều hướng, một màn hình nạp duy nhất với hướng dẫn ngay bên dưới.
3. **Không tải firmware về máy**: token phiên + mã hoá at-rest và theo phiên + giải mã trong RAM, kèm trang nói thật về giới hạn.
4. **Phong cách iOS tối giản, màu nhẹ**: grouped list, pill, kính mờ, pastel; chữ luôn đạt AA.
5. **Ủng hộ tuỳ tâm**: MoMo, ví blockchain, Buy Me a Coffee, không khoá tính năng, không popup.

Ngoài phạm vi v1 (xem mục 11): dark mode, Improv Wi-Fi, Android/WebUSB, tiếng Anh, tìm kiếm toàn site, Redis.

## 2. Kiến trúc thông tin

Điều hướng 4 mục (logo = Trang chủ): **Dự án · Firmware · Hướng dẫn · Ủng hộ**. Slug tiếng Việt không dấu; `firmware` giữ nguyên vì là thuật ngữ dùng trực tiếp trong UI. `nav-items.ts`, `FlashGuide` và `docs/ARCHITECTURE.md` cập nhật theo bảng route trong `decisions.routes`.

| Route | Vai trò |
|---|---|
| `/` | Hero + HowItWorks 3 bước + BrowserGate (chỉ hiện khi KHÔNG hỗ trợ) + FeaturedProjects + ProtocolRail + DonateTeaser |
| `/du-an`, `/du-an/[slug]` | Danh mục lọc theo giao thức/chip/độ khó/220V; trang dự án kiểu App Store: SpecRow, FeatureList, BomTable (nút "Tìm trên Shopee"), Markdown nối dây, Callout 220V, FirmwareSection, PairingTabs (Apple Home · Google Home · Home Assistant), Troubleshooting |
| `/firmware` | Thư viện firmware + thẻ **Nhận diện board** (kết nối trước, lọc firmware khớp chip, lưu RecentBoard) |
| `/firmware/[id]` | **Trình nạp ở trên, hướng dẫn sử dụng ngay bên dưới** (FlashGuide: AfterFlashSteps, MatterPairingCard, Troubleshooting, ProtectionNote), thêm SerialMonitor sau khi nạp |
| `/huong-dan`, `/huong-dan/[slug]` | 7 nhóm có sẵn trong `GUIDE_CATEGORIES`; bài "Chọn chip nào?" nằm ở đây thay vì thành mục nav |
| `/ung-ho` | 3 kênh + minh bạch chi phí + ủng hộ không tốn tiền |
| `/bao-ve-firmware` | Sơ đồ luồng, "Ngăn được / Không ngăn được", Flash Encryption + Secure Boot |
| `/api/flash/session`, `/api/flash/part` | 2 route động duy nhất (Node runtime) |

## 3. Tính năng v1 (must-have)

- Trình nạp Web Serial + esptool-js **0.7.0 (pin chính xác)**: khớp build bằng `loader.chip.CHIP_NAME` (đã xác minh `main()` trả về chuỗi mô tả "ESP32-C6 (QFN40) (revision v0.1)" nên `findBuildForChip` hiện tại không khớp — phải sửa), đọc MAC, flash size, VID/PID cầu USB.
- Luồng **2 bước có xác nhận**: *Kết nối thiết bị* → ChipCard → *Nạp firmware ESP32-C6*. Chế độ nạp bằng SegmentedControl: **Cập nhật — giữ Wi-Fi/ghép nối** | **Cài mới — xoá toàn bộ** (xác nhận bằng ConfirmDialog nếu firmware Matter).
- Kiểm tra flash: `max(offset+size) ≤ flash phát hiện` (+ `minFlashMB` tuỳ chọn trong manifest); nếu không đọc được flash size → cảnh báo, vẫn cho nạp với `flashSize: keep`.
- Baud: ROM 115200 → stub → 460800 mặc định; 921600 chỉ cho USB-JTAG (303A:1001); tự hạ 115200 khi timeout; hướng dẫn driver theo VID/PID (CH340 1A86:7523, CP210x 10C4:EA60, FTDI 0403:6001, ESP 303A:1001/4001).
- Xử lý disconnect theo trạng thái: `finishing` → thành công (S2/S3 USB-OTG tự rút–cắm), `flashing` → lỗi thật.
- Thông báo lỗi tiếng Việt kèm mã lỗi nhỏ, nút *Thử lại* giữ cổng đã cấp (`navigator.serial.getPorts()`), *Thử lại (giữ nút BOOT)* ở lần 2, thông điệp riêng cho ESP8266 với firmware Matter, nhật ký kỹ thuật che MAC + *Sao chép nhật ký*.
- **SerialMonitor** (115200, `Transport.rawRead`) mở sau khi nạp; regex `/MT:[A-Z0-9.\-]{15,}/` và `/Manual pairing code: \[?(\d{11}|\d{21})/` → **MatterPairingCard** (QR + mã thủ công + ghi chú Test VID "chọn Thêm bất chấp"). Mã cố định trong manifest chỉ là dự phòng.
- BrowserGate: chỉ hiện khi thiếu `navigator.serial`/secure context; kèm QR của URL hiện tại và nút *Sao chép liên kết* ("Tiếp tục trên máy tính" giữ sẵn firmware đã chọn qua `?fw=`).
- RecentBoards (localStorage: chip, MAC che, firmware, ngày) để lọc `/firmware` và nhắc bản mới.
- Nội dung trong repo (zod, fail build khi sai); manifest thêm `sha256`, `license`, `source`, `minFlashMB`, `pairing`.
- A11y: aria-live cho mọi trạng thái, 44×44, AA cho mọi chữ, bàn phím cho SegmentedControl/Accordion/Dialog.

## 4. Luồng nạp (`/firmware/[id]`)

`unsupported` → `idle` → `requesting-port` → `connecting` → `detecting` → `detected` (khớp build; nhánh `incompatible` / `flash-too-small` / `efuse-protected`) → (`erase-confirm`) → `preparing` (POST session → tải & giải mã từng part, tuần tự) → `erasing` (indeterminate, nếu xoá toàn bộ) → `flashing` (ghi + MD5, ProgressRing + nhãn part) → `finishing` (hard reset) → `done` → `serial-monitor` (tuỳ chọn). Mọi trạng thái từ `connecting` có *Ngắt kết nối*; `erasing`/`flashing` chặn rời trang bằng `beforeunload` + ConfirmDialog. 401/410 khi lấy part → tự xin phiên mới một lần, im lặng. Chi tiết trạng thái, nhãn và mô tả trong `decisions.flasher_states`.

**Dưới trình nạp** luôn có: AfterFlashSteps (từ `manifest.afterFlash`, theo mẫu bắt buộc: cấp nguồn lại · ý nghĩa LED · ghép nối · reset về mặc định · lỗi thường gặp), MatterPairingCard, PairingTabs rút gọn, Troubleshooting accordion, ProtectionNote, dòng nhỏ "Nạp xong? Mời MachNha một ly cà phê".

## 5. Bảo vệ firmware (và giới hạn thật)

Luồng: kho `.bin.enc` ngoài `/public` (AES-256-GCM, `FIRMWARE_MASTER_KEY`) → `POST /api/flash/session` chỉ sau khi đã nhận diện chip, server tự chọn build → token HMAC 10 phút + khoá phiên HKDF → `GET /api/flash/part?i=n` với `Authorization: Bearer` → server giải mã at-rest, mã hoá lại theo phiên (AAD `nonce:index`, IV‖ct‖tag) → trình duyệt giải mã bằng WebCrypto thẳng vào `Uint8Array` → `writeFlash` → `fill(0)`. Sổ cái single-use (410 `token-consumed`), `no-store`, `Cross-Origin-Resource-Policy: same-origin`, chặn `Sec-Fetch-Dest: document`, robots `Disallow /api/`, không Blob/ObjectURL/`download`/IndexedDB. `FLASH_SECRET` và `FIRMWARE_MASTER_KEY` bắt buộc ở production (fail-fast). Firmware `demo: true` bị chặn cấp phiên ở production.

**Nói thật trên `/bao-ve-firmware`:** DevTools có thể lấy bytes đã giải mã; `esptool read_flash` đọc ngược chip nếu chưa bật Flash Encryption; khoá phiên nằm trong JSON nên đây là "phong bì niêm phong", không phải DRM. Mục tiêu: ngăn tải tiện tay, hotlink, curl, phát tán hàng loạt, và đảm bảo mọi lượt nạp đi qua đúng bản đã phát hành. Bảo vệ thật nằm trên chip: Flash Encryption (Release) + Secure Boot v2 — bản dựng "khoá" là v2. Giấy phép: firmware gốc GPL/ESPHome kèm link nguồn/YAML và không trình bày như "khoá"; chỉ firmware tự viết dùng ghi chú source-available.

## 6. Hệ thống thiết kế

- **Màu**: giữ token trong `globals.css` (bg `#F2F2F7`, surface trắng, tint `#0A7AFF`, pastel sky/mint/lavender/peach/lemon/rose/graphite). Thêm `-strong` cho chữ trên nền soft (success `#157A3A`, warning `#9A5B00`, danger `#C1271F`). Hợp đồng tương phản: chỉ `label`, `label-2` và các `-strong`/pastel-foreground được dùng cho chữ; `label-3` chỉ cho meta ≥ 15px; `label-4` không bao giờ là chữ. Nút filled: nền tint, chữ trắng 17px/600 (≥3:1 cho chữ lớn), pressed `tint-strong`; link trong nội dung dùng `tint-strong`.
- **Nhận diện giao thức/chip không chỉ bằng màu**: ProtocolBadge = pastel + icon + chữ; ChipBadge đơn sắc mono trên `graphite-soft`.
- **Chữ**: `-apple-system, BlinkMacSystemFont, "SF Pro Text"` trước, rồi Inter (next/font, subset latin + vietnamese); line-height nới cho dấu tiếng Việt; eyebrow uppercase chỉ với từ ASCII.
- **Hình khối**: thẻ phẳng có viền hairline; bóng chỉ cho panel Flasher và Sheet; bo 8/12/20/28/pill; nav kính mờ 72% + blur 20px.
- **Chuyển động**: `--ease-ios` 180–320 ms, không parallax/carousel; `prefers-reduced-motion` chỉ còn fade.
- v1 light-only (`color-scheme: light`); token dark đã khai báo cho v2.

## 7. Nội dung seed (6 dự án)

1. Công tắc đèn Matter over Thread (ESP32-C6) — medium, 220V — **firmware ra mắt**.
2. Cảm biến nhiệt độ – độ ẩm chạy pin, Matter over Thread (ESP32-H2) — easy.
3. Đèn LED dải RGBW Matter over Wi-Fi (ESP32-S3) — medium.
4. Cảm biến cửa Matter over Wi-Fi giá rẻ (ESP32-C3 Super Mini) — easy, dự án tập ghép nối đầu tiên.
5. Ổ cắm đo điện năng Matter over Wi-Fi (ESP32-C3 + BL0942) — hard, 220V.
6. Thread Border Router một con ESP32-C6 — easy, không hàn (thay bản S3+H2).

Placeholder `matter-light-c6` hiện có được đổi tên thành seed 1. BOM, giao thức, tóm tắt trong `decisions.content_seeds`.

**Kế hoạch binary thật đầu tiên:** build `esp-matter/examples/light` cho ESP32-C6 (Matter over Thread, Test VID 0xFFF1/PID 0x8000, DAC thử nghiệm) bằng Docker `espressif/esp-matter` (pin tag), đổi GPIO relay/nút; `npm run firmware:add` → mã hoá + sha256 → manifest `demo: false`; kiểm thử ghép nối với Apple Home (Apple TV 4K/HomePod mini) và Home Assistant Matter Server trước khi công khai.

## 8. Mục ủng hộ (`/ung-ho`)

- **MoMo**: ảnh QR tĩnh xuất từ app MoMo (`content/donate/momo-qr.png`), số điện thoại che giữa + *Sao chép số*, nút *Mở MoMo* (`me.momo.vn/<handle>`) chỉ trên di động. Không tự sinh payload chưa kiểm chứng.
- **Blockchain**: SegmentedControl BTC · EVM (ETH/BSC/Polygon cùng địa chỉ 0x) · USDT TRC20 · SOL; QR từ địa chỉ đã validate lúc build (regex từng mạng, checksum EIP-55), CopyField, cảnh báo "Chỉ gửi đúng mạng", nhắc kiểm tra 4 ký tự đầu/cuối; hash địa chỉ hard-code để trang tự cảnh báo nếu `site.json` bị sửa; địa chỉ in cả trong README GitHub.
- **Buy Me a Coffee**: nút link (không nhúng script), nền `lemon-soft`; ghi chú "thẻ quốc tế/PayPal".
- **Dự phòng**: kênh `bank` (VietQR tĩnh) tắt mặc định, bật nếu BMC/MoMo không khả dụng.
- Minh bạch: "Chi phí mỗi tháng" + % đã bù (nhập tay), tường người ủng hộ, "Ủng hộ không tốn tiền". Không popup, không banner dính; chỉ một dòng ở footer, cuối dự án, và sau *Nạp xong*.
- **Checklist phát hành**: quét thử QR MoMo bằng app thật, chuyển thử 1.000 đ; xác nhận BMC trả tiền được cho chủ site tại Việt Nam, nếu không thì bật `bank`.

## 9. Thứ tự ship (MVP cut)

1. **Tuần 1 — lõi nạp đúng**: sửa `CHIP_NAME`, trạng thái `detected` + EraseModeControl, flash-size check, ledger single-use, Authorization header, at-rest encryption + `sha256` trong manifest, fail-fast env, demo guard, pin esptool-js 0.7.0, test `findBuildForChip` với chuỗi mô tả thật + mock Transport.
2. **Tuần 2 — trang & nội dung**: `/`, `/du-an`, `/du-an/[slug]`, `/huong-dan`, `/ung-ho`, `/bao-ve-firmware`; 6 seed + 6 bài hướng dẫn (driver CH340/CP210x, giữ nút BOOT, Border Router là gì, ghép nối Apple/Google/HA, xoá flash & khôi phục, reset về mặc định để ghép lại); binary thật đầu tiên.
3. **Tuần 3 — hoàn thiện**: SerialMonitor + MatterPairingCard, Nhận diện board, RecentBoards, ConfirmDialog, kiểm tra a11y/tương phản, Playwright screenshot, docs triển khai (Dockerfile Node 1 instance; Vercel chỉ khi mọi part ≤ 3,5 MB).

## 10. Rủi ro & biện pháp

- Web Serial chỉ có trên Chromium desktop → BrowserGate sớm, QR/link "Tiếp tục trên máy tính"; điện thoại là nơi đọc, máy tính là nơi nạp.
- Driver/cáp/bootloader → DriverHelp theo VID/PID, *Thử lại (giữ nút BOOT)*, ưu tiên board USB-JTAG native trong seed.
- Workshop nhiều board sau một IP → `FLASH_RATE_LIMIT` cấu hình được, chỉ tin `x-forwarded-for` khi `TRUSTED_PROXY=1`.
- Nhiều instance serverless → v1 chạy 1 instance Node; ledger/rate limit in-memory có interface để cắm Redis (v2).
- Ảnh > 3,5 MB trên Vercel → validate cảnh báo; chia đoạn là v2.
- Matter Test VID chưa chứng nhận → ghi chú ở footer, pairing card và hướng dẫn từng nền tảng; không dùng logo Matter/Thread chính thức.
- Mã ghép nối cố định trên nhiều board → ưu tiên mã đọc từ log; hướng dẫn ghép từng board một; `fctry` riêng theo phiên là v2.
- Điện lưới 220V → Callout danger bắt buộc, độ khó hard, cầu chì/varistor trong BOM, miễn trừ trách nhiệm.
- Secure Download Mode → UI chấp nhận thiếu MAC/flash size và giải thích.
- CSP strict cần nonce middleware → v1 giữ security headers hiện có, không khai CSP `default-src 'self'`; CSP nonce là v2.
- Giả mạo trang/đổi ví → hash địa chỉ hard-code, README đối chiếu, không nhận ủng hộ qua tin nhắn riêng.
- Nội dung lỗi thời → manifest ghi IDF/esp-matter version, Docker tag cố định, changelog bắt buộc.

## 11. Lộ trình (v2+)

Dark mode đầy đủ · Improv Wi-Fi Serial · WebUSB cho Android (board USB-JTAG) · bản dựng "khoá" Flash Encryption + Secure Boot v2 · dữ liệu commissioning riêng từng board · Upstash/Redis cho ledger và rate limit · chia part > 3 MB cho Vercel · CSP nonce · RSS, OG image động, JSON-LD HowTo · tìm kiếm toàn site · bài "Chọn chip nào?" dạng quiz tương tác · tiếng Anh (`content/en`) · chế độ kiosk workshop · thống kê lượt nạp ẩn danh · PartitionMap trực quan.

---

## Trạng thái triển khai (cập nhật theo mã nguồn)

**Đã làm trong v1 (repo này):** tên MachNha và tagline; route `/du-an`, `/firmware`, `/huong-dan`, `/ung-ho`, `/bao-ve-firmware`; trình nạp hai bước (Kết nối thiết bị → Nạp firmware {chip}) khớp build bằng `chip.CHIP_NAME`, kiểm tra dung lượng flash (`minFlashMB` và `offset + size`), chế độ Cập nhật / Cài mới có xác nhận, tự hạ baud 115200 khi không kết nối được, chặn rời trang khi đang ghi, reset cứng tự viết sau khi nạp; Serial Monitor 115200 bắt `MT:` và mã ghép nối thủ công → MatterPairingCard (QR + mã), dự phòng `pairing` trong manifest; BrowserGate có QR liên kết; API: token qua `Authorization: Bearer`, mỗi phần phát một lần (410 `token-consumed`), `Cross-Origin-Resource-Policy`, chặn demo ở production, fail-fast `FLASH_SECRET`, kho `.bin.enc` với `FIRMWARE_MASTER_KEY`, đối chiếu `sha256`, robots chặn `/api/`; manifest thêm `sha256`, `license`, `source`, `minFlashMB`, `pairing`; dự án có cờ `mains` (220 V); 6 dự án mẫu + 7 bài hướng dẫn; kiểm thử: smoke API, e2e với thiết bị ESP32‑C6 giả lập, kiểm tra liên kết nội dung.

**Chưa làm (để v2):** Inter qua next/font (đang dùng font hệ thống để build không phụ thuộc mạng), RecentBoards/DetectBoardCard trên `/firmware`, ProgressRing, Toast, ConfirmDialog dạng modal (đang dùng xác nhận inline), PairingTabs dạng component (đang là mục `### Apple Home / Google Home / Home Assistant` trong bài dự án), CostTransparency/SupporterWall, kênh ngân hàng VietQR, Improv Wi‑Fi, dark mode, Redis cho sổ cái phiên, instrumentation.ts kiểm tra kho firmware lúc khởi động, hạ tầng CI build‑mã hoá‑upload firmware.
