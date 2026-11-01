---
title: "Cảm biến cửa/cửa sổ Matter over Wi-Fi giá rẻ với ESP32-C3 Super Mini"
summary: "Node Matter rẻ nhất có thể làm: board ESP32-C3 Super Mini và một công tắc lưỡi gà, báo trạng thái mở/đóng vào Apple Home, Google Home hoặc Home Assistant. Cắm nguồn USB, không cần driver, hợp để tập ghép nối Matter lần đầu."
protocol: "Matter over Wi-Fi"
chips: ["ESP32-C3"]
difficulty: "easy"
timeMinutes: 30
features:
  - "Báo mở/đóng tức thì qua Matter (Contact Sensor)"
  - "Ghép nối bằng mã QR hoặc mã 11 số"
  - "Board có USB-JTAG gốc, không cần driver"
  - "Tổng chi phí linh kiện khoảng 60–90 nghìn đồng"
  - "Nút BOOT giữ 10 giây để reset về mặc định"
bom:
  - { name: "Board ESP32-C3 Super Mini (4 MB flash)", qty: 1, note: "Bản có cổng USB-C, anten gốm" }
  - { name: "Công tắc lưỡi gà (reed switch) thường mở + nam châm", qty: 1, note: "Loại gắn cửa có vỏ nhựa, dây 30 cm" }
  - { name: "Trở 10 kΩ", qty: 1, note: "Tuỳ chọn, có thể dùng pull-up nội" }
  - { name: "Cáp USB-C có dữ liệu + sạc 5V 1A", qty: 1 }
  - { name: "Băng keo 3M VHB và vỏ nhỏ in 3D", qty: 1, note: "Hoặc hộp nhựa nhỏ bất kỳ" }
firmware: ["cam-bien-cua-matter-wifi-c3"]
guides: ["bat-dau", "flash-qua-trinh-duyet", "driver-usb-va-che-do-boot", "ghep-doi-matter", "home-assistant-matter"]
tags: ["matter", "wi-fi", "cảm biến", "giá rẻ", "cửa"]
accent: "peach"
icon: "🚪"
featured: false
mains: false
updatedAt: "2026-10-31"
---

## Giới thiệu

Đây là dự án "đầu tay" lý tưởng nếu bạn chưa từng ghép nối một thiết bị Matter tự làm: chỉ một board ESP32‑C3 Super Mini (giá vài chục nghìn), một công tắc lưỡi gà gắn cửa, và một cáp USB. Sau khi nạp firmware, thiết bị hiện trong Apple Home, Google Home hoặc Home Assistant như **cảm biến tiếp xúc** (Contact Sensor) với hai trạng thái *Mở* / *Đóng*.

Vì chạy Matter over Wi‑Fi nên bạn **không cần Thread Border Router** — chỉ cần Wi‑Fi 2,4 GHz trong nhà. Đổi lại, board phải cắm nguồn USB liên tục (ESP32‑C3 giữ kết nối Wi‑Fi tốn điện hơn nhiều so với một node Thread chạy pin như dự án [cảm biến nhiệt ẩm H2](/du-an/cam-bien-nhiet-am-pin-h2)).

## Linh kiện

| Linh kiện | Số lượng | Ghi chú / thay thế mua được ở VN |
| --- | --- | --- |
| ESP32‑C3 Super Mini | 1 | Bản 4 MB flash, cổng USB‑C. Các board C3 khác (DevKitM‑1, XIAO ESP32C3) cũng dùng được, chỉ cần đổi chân GPIO trong phần nối dây |
| Reed switch thường mở + nam châm | 1 | Loại gắn cửa có vỏ nhựa trắng, dây sẵn; hoặc reed switch ống thuỷ tinh + nam châm neodymium |
| Trở 10 kΩ | 1 | Tuỳ chọn. Firmware bật pull‑up nội, nhưng trở ngoài giúp chống nhiễu khi dây dài |
| Cáp USB‑C có dữ liệu | 1 | Cáp "chỉ sạc" không nạp được firmware |
| Sạc USB 5V 1A | 1 | Sạc điện thoại cũ là đủ |
| Vỏ nhỏ + băng keo 3M VHB | 1 | Hộp in 3D hoặc hộp nhựa đựng bút |

## Nối dây

| Chân ESP32‑C3 Super Mini | Nối tới | Ghi chú |
| --- | --- | --- |
| GPIO3 | Một đầu reed switch | Ngõ vào cảm biến, pull‑up nội bật trong firmware |
| GND | Đầu còn lại của reed switch | Khi nam châm áp sát, công tắc đóng → GPIO3 nối GND = *Đóng* |
| 5V / GND | Cáp USB‑C | Cấp nguồn từ sạc |
| GPIO8 | LED trên board | Đèn trạng thái, firmware dùng sẵn, không nối thêm |

Vài lưu ý nhỏ:

- Tránh dùng **GPIO8, GPIO9** (chân strapping quyết định chế độ boot) và **GPIO18, GPIO19** (đường USB gốc) cho cảm biến.
- Nếu dây reed switch dài hơn 1 m, hàn thêm trở 10 kΩ từ GPIO3 lên 3V3 và tụ 100 nF từ GPIO3 xuống GND để chống nhiễu.
- Board Super Mini có anten gốm rất nhỏ; nhiều lô hàng bắt Wi‑Fi yếu. Đặt board cách tường kim loại, không dán sát khung nhôm cửa, và nếu vẫn chập chờn thì đặt công suất phát thấp hơn (firmware đã giảm mặc định xuống 15 dBm — mẹo quen thuộc với Super Mini).

> Reed switch không phân cực, nối chiều nào cũng được. Nam châm gắn trên cánh cửa, reed switch gắn trên khung, khoảng cách khi đóng dưới 15 mm.

## Cách hoạt động

Firmware xây trên ESP‑Matter với một endpoint **Contact Sensor** dùng cluster *BooleanState*. Khi GPIO3 đổi mức, firmware lọc nhiễu (debounce 50 ms) rồi cập nhật thuộc tính `StateValue`; các hệ sinh thái nhận thông báo gần như tức thì qua subscription Matter.

Lần đầu cấp nguồn, thiết bị quảng bá qua **BLE** để ghép nối. Ứng dụng nhà thông minh sẽ gửi thông tin Wi‑Fi qua BLE, thiết bị tham gia Wi‑Fi 2,4 GHz và từ đó giao tiếp bằng Matter over IP. Sau khi ghép nối, BLE tắt để tiết kiệm.

Đèn LED trên board cho biết trạng thái:

- Nhấp nháy chậm: chưa ghép nối, đang chờ.
- Sáng ổn định: đã ghép nối và kết nối Wi‑Fi.
- Nhấp nháy nhanh: mất Wi‑Fi, đang kết nối lại.

## Nạp firmware

Mở trang [firmware của dự án](/firmware/cam-bien-cua-matter-wifi-c3) bằng Chrome hoặc Edge trên máy tính, cắm board, nhấn **Kết nối thiết bị**. Super Mini dùng USB‑JTAG gốc của ESP32‑C3 nên trong hộp thoại cổng sẽ thấy tên *USB JTAG/serial debug unit* — không cần cài driver. Khi chip hiện là ESP32‑C3 và báo *Tương thích*, nhấn **Nạp firmware ESP32‑C3**.

Nếu board không vào được chế độ nạp (một số lô Super Mini cần thao tác tay): rút USB, **giữ nút BOOT**, cắm USB rồi thả BOOT, sau đó nhấn Thử lại. Xem thêm trong [Driver USB và chế độ bootloader](/huong-dan/driver-usb-va-che-do-boot).

Chọn **Cài mới (xoá toàn bộ)** nếu board từng chạy firmware khác hoặc đã ghép nối với hệ sinh thái khác; lần đầu với board mới thì **Cập nhật** là đủ.

## Ghép nối

Sau khi nạp xong, nhấn **Mở Serial Monitor** ngay trên trang: thiết bị in mã QR Matter (`MT:…`) và mã ghép nối 11 số khi khởi động, trang sẽ hiển thị thành thẻ **Mã ghép nối Matter** để quét. Firmware DIY dùng Test Vendor ID nên ứng dụng sẽ hỏi lại về "phụ kiện chưa được chứng nhận" — chọn *Vẫn thêm*.

### Apple Home

1. Mở ứng dụng Nhà → **+** → **Thêm phụ kiện**.
2. Quét mã QR trên màn hình, hoặc chọn *Thêm tuỳ chọn khác* → *Nhập mã* và gõ mã 11 số.
3. Chấp nhận cảnh báo phụ kiện chưa chứng nhận, chọn phòng, đặt tên (ví dụ "Cửa chính").

### Google Home

1. Mở Google Home → **+** → **Thiết lập thiết bị** → **Thiết bị mới** → chọn nhà.
2. Chọn **Thiết bị Matter**, quét mã QR.
3. Nếu Google từ chối vì Vendor ID thử nghiệm, ghép nối qua Apple Home hoặc Home Assistant trước rồi dùng chức năng chia sẻ (multi‑admin) — chi tiết trong bài [Ghép đôi Matter](/huong-dan/ghep-doi-matter).

### Home Assistant

1. Cài add‑on **Matter Server** và tích hợp **Matter** (xem [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter)).
2. Trên ứng dụng Home Assistant Companion (điện thoại) → Cài đặt → Thiết bị → **Thêm thiết bị** → **Matter** → quét mã.
3. Cảm biến xuất hiện dưới dạng `binary_sensor` với device class *door*.

## Sử dụng

- **Báo cửa mở khi vắng nhà**: automation "nếu cửa mở và chế độ Vắng nhà đang bật → gửi thông báo".
- **Bật đèn khi mở cửa**: kết hợp với [công tắc Matter over Thread](/du-an/cong-tac-den-matter-thread-c6) để bật đèn hành lang, tắt sau 2 phút.
- **Nhắc đóng cửa**: nếu cửa mở quá 10 phút, nhắc trên loa hoặc điện thoại.
- Theo dõi độ ổn định Wi‑Fi trong Home Assistant (thuộc tính RSSI) để biết có cần đổi vị trí board.

## Khôi phục & reset

- **Reset về mặc định** (xoá ghép nối và Wi‑Fi): giữ nút **BOOT** trên board trong 10 giây cho đến khi LED nhấp nháy nhanh, thiết bị khởi động lại ở trạng thái chưa ghép nối.
- **Nạp lại từ đầu**: trên trang firmware chọn chế độ **Cài mới (xoá toàn bộ)**.
- **Gỡ khỏi hệ sinh thái** trước khi reset nếu có thể, để không để lại thiết bị "ma" trong ứng dụng.

## Lỗi thường gặp

- **Không thấy cổng trong hộp thoại** → đổi cáp USB‑C có dữ liệu; thử cổng USB khác (tránh hub); trên Linux thêm người dùng vào nhóm `dialout`.
- **"Không kết nối được với bootloader"** → giữ BOOT khi cắm USB rồi nhấn Thử lại.
- **Ghép nối báo thất bại ở bước Wi‑Fi** → điện thoại phải đang ở Wi‑Fi 2,4 GHz (hoặc mạng gộp băng tần); đổi tên mạng không có ký tự đặc biệt; đưa board gần router.
- **Trạng thái bị đảo (mở thành đóng)** → nam châm gắn sai phía hoặc dùng reed switch thường đóng; đổi loại hoặc lật cấu hình trong Home Assistant bằng *invert*.
- **Cảm biến "nhảy" liên tục** → dây quá dài hoặc gần dây điện; thêm trở 10 kΩ + tụ 100 nF như phần nối dây.
- **Mất kết nối định kỳ** → Super Mini anten yếu: đổi vị trí, hoặc dùng board C3 có anten PCB lớn hơn (DevKitM‑1).

Thấy dự án hữu ích? Xem thêm ở [danh mục dự án](/du-an) hoặc [mời MachNha một ly cà phê](/ung-ho).
