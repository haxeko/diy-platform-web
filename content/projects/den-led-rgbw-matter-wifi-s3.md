---
title: "Đèn LED dải RGBW Matter over Wi-Fi với ESP32-S3"
summary: "Dải LED WS2812B/SK6812 điều khiển màu, nhiệt độ màu và độ sáng, hiện trong Apple Home/Google Home như Extended Color Light. ESP32-S3 dùng RMT ổn định với dải dài và dư tài nguyên cho hiệu ứng. Nguồn 5V, không điện lưới trực tiếp."
protocol: "Matter over Wi-Fi"
chips: ["ESP32-S3"]
difficulty: "medium"
timeMinutes: 90
features:
  - "Extended Color Light: màu, nhiệt độ màu, độ sáng"
  - "Kênh W riêng cho ánh sáng trắng (SK6812 RGBW)"
  - "Ghép đôi QR Matter qua BLE, chạy trên Wi-Fi 2.4 GHz"
  - "RMT điều khiển 120 LED mượt, không nhấp nháy"
  - "Adaptive Lighting trong Apple Home"
  - "Nguồn 5V, không chạm điện lưới"
bom:
  - { name: "ESP32-S3-DevKitC-1 (N8R8)", qty: 1, note: "8 MB flash + 8 MB PSRAM; bản N16R8 cũng dùng được" }
  - { name: "Dải LED SK6812 RGBW 60 LED/m", qty: "2 m", note: "Hoặc WS2812B RGB nếu không cần kênh trắng riêng" }
  - { name: "Nguồn 5V 10A", qty: 1, note: "Adapter kín, có chứng nhận; không dùng nguồn tổ ong hở" }
  - { name: "IC đệm mức 74AHCT125", qty: 1, note: "Dịch mức data 3.3V → 5V; thay bằng SN74AHCT125N hoặc 74HCT125" }
  - { name: "Tụ điện 1000 µF/6.3V", qty: 1, note: "Gắn song song 5V/GND ngay đầu dải" }
  - { name: "Trở 330 Ω", qty: 1, note: "Nối tiếp đường data, đặt sát DIN; 220–470 Ω đều được" }
  - { name: "Cầu chì 10A + đế", qty: 1, note: "Cầu chì lá (blade) ô tô 10A dễ mua" }
  - { name: "Dây 18 AWG đỏ/đen", qty: "2 m", note: "Cấp nguồn cả hai đầu dải" }
firmware: ["den-led-rgbw-matter-wifi-s3"]
guides: ["bat-dau", "flash-qua-trinh-duyet", "driver-usb-va-che-do-boot", "ghep-doi-matter", "home-assistant-matter"]
tags: ["matter", "wi-fi", "đèn", "led", "rgbw", "esp32-s3"]
accent: "lavender"
icon: "🌈"
featured: true
mains: false
updatedAt: "2026-10-31"
---

## Giới thiệu

Dự án này biến một dải LED địa chỉ hoá (SK6812 RGBW hoặc WS2812B RGB) thành đèn Matter chuẩn, hiện trong Apple Home, Google Home và Home Assistant như một **Extended Color Light**: bật/tắt, chỉnh độ sáng, chọn màu và đặt nhiệt độ màu từ ấm đến lạnh. Không cần hub riêng, không cần app của hãng; chỉ cần router Wi-Fi 2.4 GHz trong nhà.

Vì sao chọn ESP32-S3 thay cho ESP32-C3 hay C6? Dải LED địa chỉ hoá cần tín hiệu data chính xác đến từng trăm nano giây, và S3 có RMT peripheral nhiều kênh kèm DMA, nên 120 LED chạy mượt kể cả khi Wi-Fi và Matter stack đang bận. Bo N8R8 còn dư 8 MB PSRAM và 8 MB flash, đủ chỗ cho hiệu ứng và OTA sau này.

Mạch chạy hoàn toàn ở 5 V, bạn không phải đụng vào điện lưới. Tuy vậy nguồn 5V/10A là thiết bị cắm vào 220 V, hãy mua adapter kín, có vỏ nhựa và chứng nhận (CE/UL hoặc QCVN), tránh loại nguồn tổ ong hở để trần trên bàn. Nếu bạn mới làm quen với ESP32, đọc trước [Bắt đầu](/huong-dan/bat-dau) rồi quay lại đây.

## Linh kiện

| Linh kiện | Số lượng | Ghi chú/thay thế mua được ở VN |
|---|---|---|
| ESP32-S3-DevKitC-1 (N8R8) | 1 | Bản N16R8 hoặc bo S3 khác có chân GPIO4 đều chạy được |
| Dải LED SK6812 RGBW 60 LED/m | 2 m | WS2812B RGB rẻ hơn nhưng không có kênh W, trắng sẽ pha từ RGB |
| Nguồn 5V 10A | 1 | Adapter kín, jack DC hoặc cọc vít; không dùng nguồn tổ ong hở |
| IC đệm mức 74AHCT125 | 1 | SN74AHCT125N (DIP-14) dễ cắm breadboard; 74HCT125 dùng được, 74HC125 thì không |
| Tụ điện 1000 µF/6.3V | 1 | Tụ 10V hoặc 16V đều ổn, miễn ≥ 470 µF |
| Trở 330 Ω | 1 | 220–470 Ω, 1/4 W |
| Cầu chì 10A + đế | 1 | Cầu chì lá ô tô 10A có đế dây sẵn |
| Dây 18 AWG đỏ/đen | 2 m | Dây silicone mềm, chịu được 10 A ở quãng ngắn |
| Cáp USB-C truyền dữ liệu | 1 | Chỉ dùng khi nạp firmware và xem log |

## Nối dây

Nguyên tắc quan trọng nhất: **dải LED lấy nguồn thẳng từ adapter 5V, không bao giờ lấy từ chân 5V của bo**. Cổng USB chỉ cấp được khoảng 0,5–1 A, trong khi 120 LED RGBW sáng trắng hết cỡ có thể ngốn gần 10 A.

| Chân ESP32-S3 | Nối tới | Ghi chú |
|---|---|---|
| GPIO4 | 74AHCT125 chân 2 (1A) | Ngõ ra data 3.3V. Tránh chân strapping GPIO0/3/45/46 và GPIO35–37 (dành cho PSRAM trên bản R8) |
| — | 74AHCT125 chân 3 (1Y) → trở 330 Ω → DIN dải | Trở đặt sát đầu dải, dây data không quá 30 cm |
| GND | GND adapter, GND dải, 74AHCT125 chân 7 | **GND chung** cho nguồn, bo và dải; thiếu GND chung là lỗi phổ biến nhất |
| — | 74AHCT125 chân 14 (VCC) → 5V adapter | Chân 1 (1OE) xuống GND; chân 4, 10, 13 lên 5V; chân 5, 9, 12 xuống GND |
| — | Tụ 1000 µF song song 5V/GND tại đầu dải | Chân âm (vạch trắng) về GND |
| — | 5V adapter → cầu chì 10A → dây 18 AWG → đầu dải **và** cuối dải | Cấp nguồn hai đầu để không sụt áp |
| 5V (USB) | Để trống | Chỉ cắm USB khi nạp firmware; không cấp dải từ bo |

Vì sao cần 74AHCT125? ESP32-S3 xuất 3.3 V nhưng SK6812 chạy 5 V, ngưỡng nhận mức cao là khoảng 3,5 V. Nhiều dải vẫn "chạy được" với 3.3 V nhưng LED đầu tiên sẽ nhấp nháy ngẫu nhiên hoặc màu sai khi độ sáng thấp. Con 74AHCT125 nhận 3.3 V và xuất ra 5 V sạch, giá vài nghìn đồng, bỏ qua không đáng.

Thứ tự cấp nguồn khi chạy thực tế: cắm adapter 5V cho dải trước, rồi mới cấp nguồn cho bo (qua USB hoặc qua chân 5V-in từ adapter). Khi nạp firmware, rút adapter ra, chỉ cắm USB.

## Cách hoạt động

Firmware xây trên **esp-matter** của Espressif, khai báo một endpoint kiểu Extended Color Light với ba cluster:

- **OnOff**: bật/tắt, kèm fade 300 ms để không chói mắt.
- **LevelControl**: độ sáng 1–254, ánh xạ gamma để mức 10 % trông đúng là mờ.
- **ColorControl**: hỗ trợ cả chế độ Hue/Saturation, XY và **Color Temperature** từ 2700 K đến 6500 K (153–370 mireds). Ở chế độ nhiệt độ màu, firmware ưu tiên kênh W của SK6812 và pha thêm RGB để kéo về ấm hoặc lạnh; màu trắng vì thế mịn và đúng hơn hẳn so với pha từ ba kênh RGB. Với WS2812B không có kênh W, firmware tự chuyển sang bảng pha RGB.

Quy trình ghép đôi theo đúng chuẩn Matter over Wi-Fi: thiết bị mới quảng bá qua **BLE**, điện thoại quét mã QR và thiết lập phiên bảo mật PASE, truyền tên và mật khẩu Wi-Fi 2.4 GHz vào thiết bị, rồi thiết bị tắt BLE và từ đó nói chuyện với nhà qua IPv6/mDNS trên Wi-Fi. ESP32-S3 chỉ có radio 2.4 GHz, nên router phải phát băng này.

Dải LED được điều khiển bởi **RMT peripheral**: CPU chỉ đưa mảng màu vào bộ nhớ, RMT tự sinh dạng sóng 800 kHz cho từng bit mà không bị ngắt bởi Wi-Fi. Một khung 120 LED RGBW mất khoảng 5 ms, đủ cho 100 khung/giây.

LED RGB có sẵn trên bo (GPIO48 ở DevKitC-1 v1.1, GPIO38 ở v1.0) làm đèn trạng thái:

- **Nháy xanh dương chậm**: đang chờ ghép đôi.
- **Nháy xanh dương nhanh**: đang ghép đôi hoặc đang kết nối Wi-Fi.
- **Sáng xanh lá 2 giây rồi tắt**: đã vào mạng, hoạt động bình thường.
- **Nháy đỏ**: mất Wi-Fi, đang kết nối lại.
- **Nháy tím nhanh**: đang giữ BOOT, sắp reset về mặc định.

## Nạp firmware

Mở trang [MachNha Glow S3](/firmware/den-led-rgbw-matter-wifi-s3) bằng Chrome hoặc Edge trên máy tính. Quy trình chỉ có hai bước: **Kết nối thiết bị** rồi **Nạp firmware**.

DevKitC-1 có hai cổng USB-C, cả hai đều nạp được:

- Cổng ghi **UART** đi qua chip CP2102N, hiện trong trình duyệt là "CP2102N USB to UART". Ổn định nhất, giữ kết nối Serial Monitor liên tục kể cả khi bo reset. Nên dùng cổng này.
- Cổng ghi **USB** là USB-JTAG gốc của S3, hiện là "USB JTAG/serial debug unit". Không cần driver, nhưng mỗi lần bo khởi động lại cổng sẽ biến mất rồi hiện lại, Serial Monitor có thể rớt.

Nếu cổng không hiện, xem [Driver USB và chế độ bootloader](/huong-dan/driver-usb-va-che-do-boot). Khi được hỏi kiểu cài, chọn **"Cài mới (xoá toàn bộ)"** nếu bo đang chạy firmware khác (WLED, ESPHome, Tasmota) hoặc đã ghép với một fabric Matter cũ mà bạn muốn bỏ. Khi chỉ cập nhật phiên bản, để mặc định để giữ Wi-Fi và fabric. Chi tiết từng trạng thái trong [Nạp firmware qua trình duyệt](/huong-dan/flash-qua-trinh-duyet).

Nạp xong, bo khởi động lại và in mã QR cùng mã ghép đôi 11 số ra Serial Monitor. Bản này dùng **Test VID 0xFFF1**, nên app sẽ báo thiết bị chưa được chứng nhận; đó là chuyện bình thường với firmware tự làm.

## Ghép nối

Trước khi ghép: bật Bluetooth trên điện thoại, đứng gần bo, và nối điện thoại vào **đúng mạng Wi-Fi 2.4 GHz** mà bạn muốn đèn dùng. Nếu router tách SSID 2.4 GHz và 5 GHz riêng, chuyển điện thoại sang SSID 2.4 GHz trong lúc ghép, vì app sẽ gửi chính mạng đó cho thiết bị. Hướng dẫn đầy đủ ở [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).

### Apple Home

Mở app Nhà, nhấn **+ → Thêm phụ kiện**, quét mã QR trong Serial Monitor (hoặc chọn **Tuỳ chọn khác → Nhập mã** và gõ 11 số). Khi hiện "Phụ kiện chưa được chứng nhận", chọn **Vẫn thêm**. Đặt tên, chọn phòng; đèn xuất hiện với đầy đủ bánh xe màu và thanh nhiệt độ màu.

### Google Home

Nhấn **+ → Thiết lập thiết bị → Thiết bị mới**, chờ app tìm thấy "Thiết bị Matter" rồi quét mã QR. Google sẽ hỏi chọn mạng Wi-Fi: chọn mạng 2.4 GHz. Cảnh báo "chưa được chứng nhận" cũng hiện ở đây, nhấn tiếp tục.

### Home Assistant

Cài add-on Matter Server và tích hợp Matter theo [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter). Từ Companion app trên điện thoại, vào **Cài đặt → Thiết bị → Thêm thiết bị → Matter**, quét QR. Nếu đèn đã ghép với Apple hoặc Google, bạn có thể **chia sẻ** sang Home Assistant bằng mã ghép đôi mới mà không cần reset.

## Sử dụng

Trong Apple Home, đèn hỗ trợ **Adaptive Lighting** (Ánh sáng thích ứng): nhiệt độ màu tự dịch từ lạnh buổi sáng sang ấm buổi tối, tận dụng kênh W nên trắng rất mịn. Bạn có thể đưa đèn vào **scene** như "Xem phim" (10 %, 2700 K) hay "Làm việc" (100 %, 5000 K), gắn vào automation theo giờ hoặc theo cảm biến.

Lưu ý về hiệu ứng: Matter chuẩn chỉ định nghĩa một màu cho cả đèn, nên hiệu ứng chạy đuổi, cầu vồng… không điều khiển được từ Apple Home hay Google Home. Firmware để sẵn vài hiệu ứng đơn giản gắn vào nút BOOT (nhấn nhanh để đổi), và bạn vẫn có thể tạo hiệu ứng mượt bằng automation đổi màu theo thời gian trong Home Assistant.

## Khôi phục & reset

Để xoá fabric và quay về trạng thái chờ ghép đôi: **giữ nút BOOT 10 giây** khi bo đang chạy. LED trạng thái nháy tím nhanh trong lúc giữ, sau đó bo khởi động lại và nháy xanh dương chậm. Cách thứ hai là vào trang firmware và nạp lại với **"Cài mới (xoá toàn bộ)"**, cách này xoá cả Wi-Fi lẫn dữ liệu Matter. Nhớ xoá đèn trong app cũ trước, nếu không app sẽ báo thiết bị "không phản hồi".

## Lỗi thường gặp

- **LED đầu tiên nhấp nháy, màu sai, các LED sau loạn**: thiếu 74AHCT125 hoặc đang nối data trực tiếp 3.3 V, dây data quá dài, hoặc quên trở 330 Ω. Kiểm tra lại GND chung.
- **Cuối dải tối, trắng ngả vàng hoặc đỏ**: sụt áp trên dải. Cấp nguồn cả hai đầu bằng dây 18 AWG, giảm độ sáng tối đa, hoặc dùng dải 30 LED/m.
- **Không ghép được, app báo "không tìm thấy phụ kiện"**: điện thoại đang ở SSID 5 GHz riêng, Bluetooth chưa bật, hoặc router bật "AP/client isolation" chặn mDNS. Đứng gần bo và thử lại; chi tiết trong [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).
- **Bo reset hoặc đèn chớp rồi tắt khi bật trắng 100 %**: dải đang lấy nguồn từ bo qua USB. Dùng adapter 5V riêng và nối GND chung.
- **Trình duyệt không thấy cổng**: dùng Chrome/Edge trên máy tính, thử cổng UART thay cho USB, cài driver CP210x, hoặc giữ BOOT rồi nhấn RESET. Xem [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash).
- **Ghép xong một lúc thì "không phản hồi"**: router có band steering hoặc Wi-Fi power save quá mạnh. Ghim địa chỉ IP cho bo trong router, hoặc tạo SSID 2.4 GHz riêng cho thiết bị IoT.

Làm xong, chia sẻ ảnh dải đèn của bạn ở [các dự án khác](/du-an) hoặc [ủng hộ MachNha](/ung-ho) để chúng tôi tiếp tục làm bản firmware chính thức.
