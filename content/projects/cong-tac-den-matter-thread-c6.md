---
title: "Công tắc đèn Matter over Thread với ESP32-C6"
summary: "Công tắc 1–2 kênh ghép nối thẳng vào Apple Home, Google Home hay Home Assistant qua Thread, không cần hub của hãng. Nút bấm tại chỗ vẫn chạy khi mất mạng. Cần Thread Border Router: Apple TV 4K, HomePod mini, Nest Hub 2 hoặc Border Router của MachNha."
protocol: "Matter over Thread"
chips: ["ESP32-C6"]
difficulty: "medium"
timeMinutes: 120
features:
  - "Ghép nối thẳng vào Apple Home, Google Home, Home Assistant"
  - "Nút bấm tại chỗ hoạt động cả khi mất mạng"
  - "1–2 kênh relay opto cách ly, đóng cắt dây nóng"
  - "Khôi phục trạng thái đèn sau khi mất điện"
  - "Nguồn 220 V tích hợp, lắp gọn trong hộp âm tường"
  - "Factory reset bằng nút BOOT"
bom:
  - { name: "ESP32-C6-DevKitC-1", qty: 1, note: "Hoặc module ESP32-C6-WROOM-1-N8 nếu làm mạch riêng" }
  - { name: "Module relay 5V 1–2 kênh có opto cách ly", qty: 1, note: "SRD-05VDC-SL-C, tiếp điểm 10 A/250 VAC" }
  - { name: "Nguồn Hi-Link HLK-PM01 220V→5V/3W", qty: 1, note: "Dùng 2 relay thì chọn bản 5 W (HLK-5M05)" }
  - { name: "Nút nhấn tactile 12 mm tự nhả", qty: "1–2", note: "Mỗi kênh một nút" }
  - { name: "Tụ gốm 100 nF", qty: "1–2", note: "Chống nhiễu, dội phím cho nút nhấn" }
  - { name: "Cầu chì 1 A + đế 5×20 mm", qty: 1 }
  - { name: "Varistor 10D471K", qty: 1 }
  - { name: "Hộp âm tường nhựa chống cháy", qty: 1, note: "Loại đế sâu để đủ chỗ cho bo và nguồn" }
  - { name: "Domino, dây 1,5 mm²", qty: "vài đoạn", note: "Dây phía 220 V" }
firmware: ["cong-tac-den-matter-thread-c6"]
guides: ["bat-dau", "flash-qua-trinh-duyet", "driver-usb-va-che-do-boot", "ghep-doi-matter", "thread-border-router", "home-assistant-matter", "khac-phuc-loi-flash"]
tags: ["matter", "thread", "công tắc", "220V", "relay"]
accent: "mint"
icon: "🔘"
featured: true
mains: true
updatedAt: "2026-10-31"
---

## Giới thiệu

Công tắc này thay chiếc công tắc cơ trong hộp âm tường bằng một bo ESP32-C6, module relay và nguồn Hi-Link nhỏ gọn. Sau khi nạp firmware, nó xuất hiện như một phụ kiện Matter bình thường: thêm vào Apple Home, Google Home hoặc Home Assistant bằng mã QR, không cần hub hay app riêng của hãng nào. Nút nhấn tại chỗ vẫn bật/tắt đèn như công tắc thường, kể cả khi Wi-Fi hay internet gặp sự cố, vì lệnh được xử lý ngay trên chip.

Dự án dành cho bạn đã quen hàn mạch và hiểu rõ nguy hiểm của điện lưới. Nếu mới bắt đầu, hãy làm [đèn Matter cơ bản](/du-an/den-led-rgbw-matter-wifi-s3) chạy USB trước để quen với quy trình flash và ghép nối, rồi quay lại đây.

Bạn cần chuẩn bị:

- **Thread Border Router** đang hoạt động trong nhà: Apple TV 4K (đời 2021 trở lên), HomePod mini, HomePod thế hệ 2, Google Nest Hub thế hệ 2, Nest Wifi Pro, hoặc tự dựng theo hướng dẫn [Thread Border Router](/huong-dan/thread-border-router).
- Điện thoại có Bluetooth (dùng cho bước commissioning) và cài app nhà thông minh tương ứng.
- Máy tính chạy Chrome hoặc Edge cùng cáp USB-C truyền dữ liệu để nạp firmware qua trình duyệt.

## An toàn điện 220 V

> **Cảnh báo: điện lưới có thể gây chết người.**
> - Ngắt cầu dao (CB/aptomat) của nhánh đèn trước khi mở hộp âm tường, rồi dùng bút thử điện kiểm tra lại cả dây L và N.
> - Luôn lắp cầu chì 1 A và varistor 10D471K phía 220 V, trước nguồn HLK-PM01.
> - Toàn bộ mạch phải nằm trong hộp nhựa chống cháy; không để dây hở hay mối hàn chạm vỏ kim loại.
> - Không chạm vào bất kỳ phần nào của mạch khi đang cấp nguồn 220 V, kể cả phía 5 V, vì một mối nối sai có thể đưa điện lưới sang.
> - Chỉ dùng relay đúng dòng cho tải; không đóng cắt quạt, máy bơm hay tải cảm lớn bằng relay 10 A loại này.
> - Bạn tự chịu trách nhiệm cho mạch mình lắp. Nếu không chắc, hãy nhờ thợ điện có tay nghề đấu phần 220 V.

Quy trình an toàn: lắp và kiểm tra toàn bộ phần logic (ESP32-C6, relay, nút nhấn) bằng nguồn USB trước. Chỉ khi firmware đã chạy, LED báo đúng và relay kêu "tạch" theo lệnh, bạn mới tháo USB, đấu HLK-PM01 và tiếp điểm relay vào mạch đèn. Không bao giờ cắm USB vào bo khi mạch đang nối 220 V.

## Linh kiện

| Linh kiện | Số lượng | Ghi chú / thay thế mua được ở VN |
|---|---|---|
| ESP32-C6-DevKitC-1 | 1 | Bo dev nạp qua USB-C rất tiện. Làm mạch riêng thì dùng module ESP32-C6-WROOM-1-N8 (flash 8 MB) |
| Module relay 5 V 1–2 kênh, opto cách ly | 1 | Dùng relay SRD-05VDC-SL-C (Songle), tiếp điểm ghi 10 A/250 VAC. Chọn loại có jumper JD-VCC |
| Nguồn Hi-Link HLK-PM01 (220 V → 5 V/3 W) | 1 | Dùng 2 relay thì chọn bản 5 W (HLK-5M05) cho dư dòng |
| Nút nhấn tactile 12 mm tự nhả | 1–2 | Mỗi kênh một nút; loại 12×12 mm có mũ nhựa dễ bấm qua mặt hộp |
| Tụ gốm 100 nF | 1–2 | Mắc song song với nút nhấn để chống nhiễu, dội phím |
| Cầu chì 1 A + đế cầu chì 5×20 mm | 1 | Lắp nối tiếp dây L, trước HLK-PM01 |
| Varistor 10D471K | 1 | Mắc song song L–N sau cầu chì, chặn xung sét và đột biến điện áp |
| Hộp âm tường nhựa chống cháy | 1 | Hộp đế sâu (khoảng 50 mm trở lên) để đủ chỗ cho bo và nguồn |
| Domino, dây 1,5 mm² | vài đoạn | Dây phía 220 V; phía 5 V dùng dây 0,5 mm² hoặc jumper |
| Cáp USB-C truyền dữ liệu | 1 | Chỉ dùng khi nạp firmware, không cắm khi mạch đang nối 220 V |

## Nối dây

| Chân ESP32-C6 | Nối tới | Ghi chú |
|---|---|---|
| GPIO4 | IN1 module relay | Kênh 1. Module thường kích mức thấp (active-low) |
| GPIO6 | IN2 module relay | Kênh 2, bỏ qua nếu chỉ dùng 1 kênh |
| GPIO5 | Nút nhấn 1 → GND | Pull-up nội, tụ 100 nF mắc song song nút |
| GPIO7 | Nút nhấn 2 → GND | Như trên |
| 5V | +5 V từ HLK-PM01 và VCC/JD-VCC module relay | Bo DevKitC-1 có LDO hạ xuống 3,3 V cho chip |
| GND | GND HLK-PM01, GND module relay, chân chung các nút | Nối chung một điểm |
| GPIO8 | LED RGB có sẵn trên bo | LED trạng thái, không nối gì thêm |
| GPIO9 | Nút BOOT có sẵn trên bo | Giữ 10 giây để factory reset |

Phía 220 V (đi dây 1,5 mm²): dây L vào cầu chì 1 A, ra khỏi cầu chì nối đến chân AC của HLK-PM01 và đến **COM** của relay; varistor mắc giữa L (sau cầu chì) và N. Dây N nối chân AC còn lại của HLK-PM01 và đi thẳng lên bóng đèn. Tiếp điểm **NO** của relay nối ra dây L của bóng đèn, nhờ vậy relay đóng cắt dây nóng và đèn tắt là tắt hẳn. Với 2 kênh, COM của hai relay nối chung L, hai chân NO đi ra hai bóng.

Vài điều cần nhớ:

- **Tránh các strapping pin GPIO8, GPIO9 và GPIO15.** Chúng quyết định chế độ boot và JTAG lúc khởi động; treo relay vào đó có thể làm bo không boot hoặc relay nhảy lúc bật nguồn. GPIO4/GPIO5 cũng được datasheet liệt kê là strapping pin nhưng chỉ ảnh hưởng timing SDIO, dùng cho relay và nút không sao. Tránh luôn GPIO12/13 (USB) và GPIO16/17 (UART0).
- Module relay 5 V kích bằng 3,3 V từ ESP32 được, vì opto chỉ cần chân IN bị kéo xuống thấp. Nếu relay không đóng, kiểm tra jumper JD-VCC đã gắn và VCC có 5 V.
- Tụ 100 nF đặt sát chân nút giúp lọc nhiễu cao tần do dây dài trong tường; firmware còn có debounce phần mềm.
- Đặt HLK-PM01 và cầu chì tách xa bo ESP32-C6, chừa khe thoáng; HLK-PM01 chỉ ấm nhẹ khi chạy đúng tải.

## Cách hoạt động

Thiết bị chạy **Matter over Thread**. Lần đầu cấp nguồn, nó quảng bá qua BLE để điện thoại tìm thấy (commissioning). App đọc mã QR, trao đổi khoá, rồi gửi thông tin mạng Thread (lấy từ Border Router) xuống thiết bị. ESP32-C6 tắt BLE, tham gia mạng Thread và từ đó mọi lệnh đi qua IPv6 trong mạng nhà, không qua server của hãng nào.

Mỗi kênh là một endpoint kiểu *On/Off Light* với **OnOff cluster** chuẩn Matter, nên mọi app hiểu Matter đều điều khiển được mà không cần driver riêng. Nút nhấn tại chỗ đảo trạng thái trực tiếp trên chip và báo trạng thái mới về app; vì logic chạy local nên mất internet hay mất Border Router thì nút vẫn bật tắt đèn bình thường, chỉ việc điều khiển từ xa bị gián đoạn.

Vì được cấp nguồn liên tục, thiết bị được cấu hình làm Full Thread Device và có thể lên vai trò Router trong mesh, giúp các cảm biến chạy pin trong nhà có thêm điểm nối.

Ý nghĩa LED RGB trên bo (firmware MachNha):

- **Nháy xanh dương**: đang chờ ghép nối qua BLE.
- **Nháy xanh lá**: đã nhận thông tin Thread, đang tham gia mạng.
- **Sáng xanh lá yếu rồi tắt**: đã kết nối, hoạt động bình thường.
- **Nháy đỏ nhanh**: đang giữ nút BOOT, sắp factory reset.

## Nạp firmware

Vào trang firmware [MachNha Switch](/firmware/cong-tac-den-matter-thread-c6), cắm bo qua USB-C (chỉ khi **chưa** nối 220 V) và làm theo hai bước: **Kết nối thiết bị** để trình duyệt nhận cổng serial, rồi **Nạp firmware**. Nếu bo chưa từng chạy firmware MachNha, đang có fabric Matter cũ hoặc lần nạp trước bị lỗi giữa chừng, hãy chọn **Cài mới (xoá toàn bộ)** để xoá sạch flash trước khi ghi; nếu chỉ cập nhật phiên bản thì để mặc định để giữ thông tin ghép nối. Chưa làm bao giờ thì đọc [Nạp firmware qua trình duyệt](/huong-dan/flash-qua-trinh-duyet) và [Driver USB và chế độ boot](/huong-dan/driver-usb-va-che-do-boot) trước.

## Ghép nối

Sau khi nạp xong, mở Serial Monitor (115200 baud) ngay trong trang firmware: log khởi động sẽ in mã QR dạng `MT:...` và mã thủ công 11 số. Firmware DIY dùng Test Vendor ID (0xFFF1) nên app sẽ cảnh báo thiết bị chưa được chứng nhận, đó là điều bình thường. Hướng dẫn chi tiết hơn ở [Ghép đôi Matter](/huong-dan/ghep-doi-matter).

### Apple Home

1. Mở app **Nhà** → dấu **+** → **Thêm phụ kiện**.
2. Quét mã QR trong Serial Monitor (hoặc chọn *Thêm tuỳ chọn khác* → *Nhập mã* và gõ mã 11 số).
3. Khi hiện "**Phụ kiện chưa được chứng nhận**", chọn **Vẫn thêm**.
4. Chờ 30–60 giây để thiết bị tham gia Thread qua Apple TV/HomePod, rồi đặt tên và chọn phòng.

### Google Home

1. Mở **Google Home** → **+** → **Thiết bị** → **Thiết bị hỗ trợ Matter**.
2. Quét QR hoặc nhập mã thủ công.
3. Nếu app báo thiết bị không được hỗ trợ: vào Google Home Developer Console, tạo project và khai báo VID `0xFFF1` / PID `0x8000` bằng cùng tài khoản Google. Google chỉ cho commission thiết bị test khi VID/PID đã được khai báo.

### Home Assistant

1. Cài add-on **Matter Server** và tích hợp **Matter**; nếu nhà không có Border Router của Apple/Google thì cài thêm **OpenThread Border Router** theo [Home Assistant và Matter](/huong-dan/home-assistant-matter).
2. Mở app **Home Assistant Companion** trên điện thoại (cần BLE) → *Cài đặt* → *Thiết bị & dịch vụ* → *Thêm thiết bị Matter*.
3. Quét QR và chờ; thực thể `light.` hoặc `switch.` cho từng kênh sẽ xuất hiện.

Nếu thiết bị đã nằm trong Apple Home, bạn không cần reset để thêm vào Home Assistant: trong Apple Home mở phụ kiện → *Bật chế độ ghép nối* để lấy mã mới, rồi nhập vào Home Assistant. Một thiết bị Matter có thể thuộc nhiều fabric cùng lúc.

## Sử dụng

Nút nhấn tại chỗ luôn đảo trạng thái đèn, kể cả khi mất Wi-Fi, internet hay Border Router. Từ app bạn có thể tạo automation như: bật đèn hiên lúc hoàng hôn và tắt lúc 23:00; đèn nhà vệ sinh tự tắt sau 15 phút; gộp công tắc với các đèn Matter khác vào cảnh "Về nhà"; hoặc kết hợp cảm biến cửa để bật đèn hành lang khi mở cửa.

Khi mất điện, relay nhả nên đèn tắt. Lúc có điện lại, firmware MachNha đọc trạng thái cuối lưu trong NVS và khôi phục, nên đèn trở về đúng trạng thái trước khi mất điện. Thông tin fabric và mạng Thread cũng nằm trong NVS, thiết bị tự nối lại mà không cần ghép lại.

## Khôi phục & reset

- **Factory reset bằng nút**: giữ nút **BOOT** trên bo khoảng 10 giây đến khi LED nháy đỏ và thiết bị khởi động lại (firmware MachNha). Toàn bộ fabric và thông tin Thread bị xoá, LED quay lại nháy xanh dương chờ ghép nối. Nhớ xoá thiết bị khỏi app trước, nếu không app sẽ hiện thiết bị "không phản hồi".
- **Reset bằng cách nạp lại**: vào trang firmware và chọn **Cài mới (xoá toàn bộ)**. Cách này xoá luôn NVS và sửa được cả lỗi do dữ liệu flash hỏng.
- Nạp nhầm firmware khác? Chỉ cần nạp lại từ trang MachNha. ROM bootloader của ESP32-C6 nằm trong ROM nên không thể bị xoá qua Web Serial.

## Lỗi thường gặp

- **Trình duyệt không thấy cổng COM** → dùng Chrome/Edge trên máy tính, thay cáp USB-C có dây dữ liệu, cài driver theo [Driver USB và chế độ boot](/huong-dan/driver-usb-va-che-do-boot). Bo DevKitC-1 có 2 cổng USB-C, cổng *USB* (USB-Serial-JTAG tích hợp) và cổng *UART* (chip CH343), cả hai đều nạp được.
- **Nạp báo lỗi hoặc dừng giữa chừng** → giữ BOOT, nhấn RST, thả BOOT rồi nạp lại với "Cài mới"; hạ baudrate nếu cáp dài. Xem [Khắc phục lỗi flash](/huong-dan/khac-phuc-loi-flash).
- **App không tìm thấy thiết bị** → LED phải đang nháy xanh dương, nếu không thì factory reset. Bật Bluetooth, đứng gần thiết bị và chắc rằng điện thoại cùng mạng với Border Router.
- **Ghép được nhưng báo "không phản hồi" sau vài phút** → Border Router chưa hoạt động hoặc ở quá xa. Kiểm tra Apple TV/HomePod đã cập nhật và không bị rút điện; xem [Thread Border Router](/huong-dan/thread-border-router).
- **Relay kêu nhưng đèn không sáng, hoặc sáng ngược** → đổi dây giữa NO và NC, kiểm tra dây L có đi qua COM; nếu nút nhấn tự bật tắt lung tung thì thiếu tụ 100 nF hoặc dây nút chạy quá sát dây 220 V.
- **ESP32-C6 khởi động lại khi relay đóng** → nguồn không đủ dòng hoặc bị nhiễu; thêm tụ 470 µF trên đường 5 V, dùng bản HLK 5 W nếu chạy 2 relay.

Thấy dự án hữu ích? Xem thêm các [dự án khác](/du-an) hoặc [ủng hộ MachNha](/ung-ho) để duy trì máy chủ nạp firmware.
