---
title: "Bắt đầu với ESP32, Matter và Thread"
summary: "Matter và Thread là gì, chọn chip ESP32 nào cho dự án nào, cần chuẩn bị gì và cách nạp firmware trong 3 bước ngay trên trình duyệt."
category: "bat-dau"
order: 10
projects: []
updatedAt: "2026-10-31"
---

## Matter và Thread là gì?

**Matter** là chuẩn nhà thông minh do Connectivity Standards Alliance (CSA) phát triển, được Apple, Google, Amazon, Samsung và hàng trăm hãng khác hỗ trợ. Điểm quan trọng nhất: một thiết bị Matter có thể ghép đôi và điều khiển từ Apple Home, Google Home, Alexa hay Home Assistant mà không cần cloud của hãng sản xuất. Matter chạy trên IP, nên nó cần một đường truyền mạng bên dưới — hiện tại là Wi‑Fi, Ethernet hoặc Thread.

**Thread** là mạng mesh không dây tiết kiệm năng lượng chạy trên sóng 2.4 GHz (IEEE 802.15.4, cùng lớp vật lý với Zigbee). Khác với Zigbee, Thread dùng IPv6 nên thiết bị Thread "nói chuyện" được với mạng nhà bạn thông qua một **Border Router**. Thread phù hợp cho cảm biến chạy pin, công tắc, đèn — những thứ cần phản hồi nhanh, ít tốn điện và tự tìm đường khi một node mất kết nối.

Hai thứ này hay đi cùng nhau: **Matter over Thread** là cách phổ biến nhất để làm thiết bị DIY ghép thẳng vào Apple Home hay Google Home mà không cần hub riêng của hãng.

> Thread không thay thế Wi‑Fi. Camera, màn hình hay thiết bị truyền nhiều dữ liệu vẫn nên dùng **Matter over Wi‑Fi**.

## Chọn chip ESP32 nào?

Espressif có nhiều dòng chip; không phải chip nào cũng có radio 802.15.4 cho Thread. Bảng dưới tóm tắt các lựa chọn thường gặp:

| Chip | Radio | Hợp với | Ghi chú |
| --- | --- | --- | --- |
| **ESP32‑C6** | Wi‑Fi 6 (2.4 GHz) · Thread/Zigbee · BLE 5 | Matter over Thread **và** Matter over Wi‑Fi | Lựa chọn "đa năng" tốt nhất hiện nay cho Matter. Giá rẻ, có USB‑JTAG/serial tích hợp. |
| **ESP32‑H2** | Thread/Zigbee · BLE 5 (không Wi‑Fi) | Node chạy pin, cảm biến Thread | Tiêu thụ thấp hơn C6; không làm được Matter over Wi‑Fi. |
| **ESP32‑S3** | Wi‑Fi 4 · BLE 5 | Matter over Wi‑Fi, camera, màn hình, LVGL | Hai nhân, nhiều RAM/PSRAM, hỗ trợ camera và USB OTG. |
| **ESP32‑C3** | Wi‑Fi 4 · BLE 5 | Thiết bị Wi‑Fi giá rẻ, ESPHome | Một nhân RISC‑V, đủ cho relay/cảm biến đơn giản. |
| **ESP32** (classic) | Wi‑Fi 4 · Bluetooth Classic/BLE 4.2 | Dự án cũ, ESPHome | Vẫn chạy được Matter over Wi‑Fi nhưng RAM hạn chế; nhiều chân strapping cần lưu ý. |

Nếu bạn mới bắt đầu và muốn làm Matter: **mua ESP32‑C6**. Nếu bạn làm cảm biến chạy pin đặt xa ổ điện: **ESP32‑H2**. ESP32‑C5 (Wi‑Fi 6 băng tần kép + Thread) cũng đã có dev kit; firmware trên trang này sẽ ghi rõ khi hỗ trợ.

Trang flash sẽ **tự nhận diện chip** khi bạn cắm bo; bạn chỉ cần chọn firmware của dự án. Nếu firmware không có bản dựng cho chip của bạn, trang sẽ báo ngay.

## Cần chuẩn bị gì?

### Phần cứng tối thiểu

- **Bo phát triển (dev kit)** có cổng USB, ví dụ ESP32‑C6‑DevKitC‑1, ESP32‑H2‑DevKitM‑1, ESP32‑S3‑DevKitC‑1 hoặc các bo tương đương từ Seeed (XIAO), Waveshare, M5Stack…
- **Cáp USB truyền dữ liệu.** Rất nhiều cáp đi kèm sạc dự phòng chỉ có dây nguồn; nếu máy tính không thấy cổng nào, hãy đổi cáp trước khi nghi ngờ driver.
- Máy tính chạy Windows, macOS, Linux hoặc ChromeOS với **Chrome, Edge, Opera, Arc hoặc Brave**. Safari, Firefox và trình duyệt trên điện thoại chưa hỗ trợ Web Serial.

### Thread Border Router (cho dự án Matter over Thread)

Thiết bị Thread không nối thẳng vào Wi‑Fi. Bạn cần một trong các thiết bị sau trong nhà, cùng mạng với điện thoại:

| Hệ sinh thái | Border Router |
| --- | --- |
| Apple Home | Apple TV 4K (từ đời 2021; bản 3rd gen cần model có Ethernet), HomePod mini, HomePod (2nd gen) |
| Google Home | Nest Hub (2nd gen), Nest Hub Max, Nest Wifi Pro |
| Amazon Alexa | Echo (4th gen) và một số Echo đời mới hơn |
| Home Assistant | Home Assistant + Connect ZBT‑1 (tên cũ SkyConnect) hoặc dongle EFR32 khác chạy add-on OpenThread Border Router |
| Tự làm | ESP Thread Border Router (bo ESP32‑S3 + ESP32‑H2 của Espressif) |

Chi tiết trong [Thread và Border Router](/huong-dan/thread-border-router). Dự án **Matter over Wi‑Fi** thì không cần Border Router, chỉ cần Wi‑Fi 2.4 GHz.

> Dự án nào có nối với điện lưới 220 V (relay, công tắc tường, ổ cắm) đều tiềm ẩn nguy hiểm. Ngắt cầu dao trước khi đấu nối và chỉ cấp nguồn khi đã đóng hộp cách điện.

## Nạp firmware trong 3 bước

Trang này không yêu cầu cài Arduino IDE, ESP‑IDF hay esptool. Mọi thứ chạy trong trình duyệt qua Web Serial:

1. **Cắm bo vào máy tính.** Bo dùng chip CP2102/CH340 có thể cần driver (xem [Driver USB, cáp và chế độ bootloader](/huong-dan/driver-usb-va-che-do-boot)). ESP32‑C3/C6/S3/H2 có cổng USB gốc thì không cần driver.
2. **Chọn firmware** tại [/firmware](/firmware). Mỗi firmware ghi rõ chip hỗ trợ, phiên bản, changelog và các bước sau khi flash.
3. **Nhấn Kết nối & Flash**, chọn cổng trong hộp thoại của trình duyệt (tên thường là USB Serial, CP210x, CH340 hoặc USB JTAG/serial debug unit) rồi chờ. Trang sẽ kết nối bootloader, nhận diện chip, nhận gói firmware mã hoá theo phiên, ghi và kiểm tra MD5, cuối cùng khởi động lại thiết bị.

Nếu bo không tự vào bootloader: giữ nút **BOOT**, nhấn **RESET**, thả BOOT rồi nhấn Kết nối lại. Toàn bộ quy trình được giải thích trong [Nạp firmware ngay trên trình duyệt](/huong-dan/flash-qua-trinh-duyet).

## Sau khi flash: đưa thiết bị vào nhà thông minh

- Với dự án Matter, mở Apple Home / Google Home / Alexa / Home Assistant, chọn **Thêm phụ kiện** và quét mã QR Matter in trong trang dự án (hoặc nhập mã 11 số). Hướng dẫn từng hệ sinh thái tại [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).
- Dùng Home Assistant? Xem [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter) để cài Matter Server, OpenThread Border Router và viết automation đầu tiên.
- Gặp lỗi? Bảng triệu chứng → nguyên nhân → cách sửa nằm ở [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash).

## Đi tiếp

- Duyệt các [dự án](/du-an) theo giao thức (Matter over Thread, Matter over Wi‑Fi, Zigbee, ESP‑NOW…) và độ khó.
- Tài liệu gốc nếu bạn muốn tự build firmware: [ESP‑IDF](https://docs.espressif.com/projects/esp-idf/en/latest/), [ESP‑Matter SDK](https://docs.espressif.com/projects/esp-matter/en/latest/), [Thread Group](https://www.threadgroup.org/) và [CSA Matter](https://csa-iot.org/all-solutions/matter/).
- Nếu các dự án giúp ích cho bạn, hãy ghé [trang ủng hộ](/ung-ho) để mình duy trì máy chủ và mua linh kiện thử nghiệm.
