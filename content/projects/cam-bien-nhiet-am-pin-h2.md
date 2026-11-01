---
title: "Cảm biến nhiệt độ – độ ẩm chạy pin, Matter over Thread với ESP32-H2"
summary: "Sleepy End Device đo nhiệt độ/độ ẩm mỗi 60 giây bằng SHT40, chạy nhiều tháng với 2 pin AA. ESP32-H2 không có Wi-Fi nên tiêu thụ rất thấp; hiện trong Apple Home như cảm biến nhiệt độ và độ ẩm. Lý tưởng cho người mới, không điện lưới."
protocol: "Matter over Thread"
chips: ["ESP32-H2"]
difficulty: "easy"
timeMinutes: 45
features:
  - "Sleepy End Device, ngủ giữa các lần đo"
  - "Đo nhiệt độ/độ ẩm mỗi 60 giây bằng SHT40"
  - "Chạy nhiều tháng với 2 pin AA"
  - "Báo mức pin lên app"
  - "Ghép đôi bằng mã QR Matter"
  - "Không điện lưới, an toàn cho người mới"
bom:
  - { name: "ESP32-H2-DevKitM-1", qty: 1, note: "hoặc module ESP32-H2-MINI-1-N4 hàn lên board breakout" }
  - { name: "Cảm biến Sensirion SHT40", qty: 1, note: "I²C, breakout 3.3V" }
  - { name: "Hộp pin 2×AA + diode Schottky bảo vệ ngược", qty: 1, note: "hoặc CR123A + LDO HT7333" }
  - { name: "Tụ 100 µF low-ESR", qty: 1, note: "hàn sát chân 3V3–GND" }
  - { name: "Trở kéo 4,7 kΩ", qty: 2, note: "pull-up SDA/SCL, bỏ qua nếu breakout đã có" }
  - { name: "Vỏ in 3D có khe thoáng", qty: 1 }
firmware: ["cam-bien-nhiet-am-pin-h2"]
guides: ["bat-dau", "flash-qua-trinh-duyet", "ghep-doi-matter", "thread-border-router", "home-assistant-matter"]
tags: ["matter", "thread", "cảm biến", "pin", "nhiệt độ", "độ ẩm", "SHT40"]
accent: "sky"
icon: "🌡️"
featured: true
mains: false
updatedAt: "2026-10-31"
---

## Giới thiệu

Đây là dự án Matter over Thread "đúng nghĩa chạy pin" đầu tiên của MachNha: một bo ESP32-H2, một cảm biến SHT40 và hai viên pin AA. Thiết bị hoạt động như **Sleepy End Device** (SED) trong mạng Thread — ngủ gần như toàn thời gian, mỗi 60 giây thức dậy đo nhiệt độ/độ ẩm, gửi về Border Router rồi ngủ tiếp. Không dây nguồn, không ổ cắm, đặt được ở bất cứ đâu: phòng ngủ em bé, tủ quần áo, gác mái, hộp đồng hồ điện.

ESP32-H2 là chip hợp nhất của Espressif cho việc này: nó **không có Wi-Fi**, chỉ có radio 802.15.4 (Thread/Zigbee) và BLE, nên dòng tiêu thụ khi ngủ lẫn khi phát đều thấp hơn hẳn ESP32-C6. Đổi lại, bạn **bắt buộc phải có Thread Border Router** (Apple TV 4K, HomePod mini, Google Nest Hub thế hệ 2, hoặc Home Assistant với dongle Thread) — không có Border Router thì cảm biến không có đường ra mạng nhà. Nếu chưa có, đọc [hướng dẫn Thread Border Router](/huong-dan/thread-border-router) trước.

Sau khi ghép nối, cảm biến hiện trong Apple Home, Google Home hoặc Home Assistant như hai thực thể nhiệt độ và độ ẩm (kèm mức pin), dùng được trong automation như mọi phụ kiện chính hãng. Dự án không chạm điện lưới, phù hợp cho người mới bắt đầu.

## Linh kiện

| Linh kiện | Số lượng | Ghi chú/thay thế mua được ở VN |
|---|---|---|
| ESP32-H2-DevKitM-1 | 1 | Có USB-JTAG tích hợp, nạp không cần driver. Thay thế: module ESP32-H2-MINI-1-N4 hàn lên board breakout (nạp qua mạch USB-UART rời). |
| Cảm biến Sensirion SHT40 | 1 | Chọn breakout 3.3 V, I²C địa chỉ 0x44. SHT41/SHT45 dùng chung lệnh. Tránh hàng giá quá rẻ, thường là chip tái chế sai số lớn. |
| Hộp pin 2×AA có dây | 1 | Pin AA lithium (Energizer L91) giữ điện áp phẳng, bền nhất; alkaline chạy được nhưng ngắn hơn. Thay thế: 1 viên CR123A + LDO HT7333 ra 3,3 V ổn định. |
| Diode Schottky | 1 | 1N5819, SS14 hoặc BAT54 — mắc nối tiếp từ BAT+ vào 3V3, chặn dòng ngược từ bo về pin khi cắm USB nạp firmware. |
| Tụ 100 µF low-ESR | 1 | Tụ hoá hoặc tantalum, hàn sát chân 3V3–GND. Đỡ sụt áp khi radio phát, giúp pin yếu vẫn khởi động được. |
| Trở 4,7 kΩ | 2 | Pull-up SDA và SCL lên 3V3. Nhiều breakout SHT40 đã có pull-up 10 kΩ sẵn — khi đó bỏ qua. |
| Vỏ in 3D có khe thoáng | 1 | Hộp có rãnh bất kỳ, miễn SHT40 "thở" được và không nằm sát chip. In PETG nếu đặt nơi ẩm. |

Tổng chi phí khoảng 250–350 nghìn đồng tuỳ nơi mua, trong đó bo DevKitM chiếm hơn nửa.

## Nối dây

Toàn bộ mạch chạy ở **3,3 V**, không có linh kiện nào cần 5 V. Nối theo bảng sau (tên chân in trên bo DevKitM-1):

| Chân ESP32-H2 | Nối tới | Ghi chú |
|---|---|---|
| GPIO10 | SHT40 SDA | Bus I²C. Trở 4,7 kΩ kéo lên 3V3 nếu breakout chưa có pull-up. |
| GPIO11 | SHT40 SCL | Bus I²C. Trở 4,7 kΩ kéo lên 3V3 như trên. |
| 3V3 | SHT40 VDD | Cấp nguồn cảm biến trực tiếp, không qua LDO phụ. |
| GND | SHT40 GND, BAT− | Mass chung. |
| 3V3 | BAT+ qua diode Schottky | Anode về pin, cathode về 3V3. Tụ 100 µF nối từ điểm này xuống GND. |
| GPIO1 (tuỳ chọn) | BAT+ qua cầu chia 2×100 kΩ | ADC đo điện áp pin để báo % pin. Không nối thì firmware báo cố định 100 %. |
| GPIO8, GPIO9 | *Để trống* | Chân strapping (LED RGB và nút BOOT trên bo). Đừng treo cảm biến hay pull-up vào đây, bo có thể không boot. |

Vài điều đáng lưu ý:

- **Cấp pin vào chân 3V3, không vào 5V.** Chân 5V đi qua LDO trên bo; LDO cần đầu vào cao hơn 3,3 V và tự tiêu tốn vài chục µA — phí pin vô ích. Nối thẳng vào 3V3 là bỏ qua LDO.
- **Diode Schottky là bắt buộc** nếu bạn vừa cắm USB vừa lắp pin: không có nó, LDO 3,3 V trên bo sẽ "sạc ngược" vào pin AA — nguy hiểm với pin lithium không sạc. Ở dòng tiêu thụ nhỏ của thiết bị, diode chỉ sụt khoảng 0,1–0,2 V.
- **Chọn chân I²C.** Firmware dùng GPIO10/GPIO11 vì chúng không mang chức năng đặc biệt nào trên H2. Bạn có thể đổi khi tự build, nhưng tránh GPIO8/GPIO9 (strapping), GPIO23/GPIO24 (UART0 log) và GPIO26/GPIO27 (USB).
- **Vị trí SHT40.** Nối dây dài 5–10 cm để cảm biến nằm xa chip và tụ, gần khe thoáng của vỏ; đặt sát chip sẽ đo nhiệt cao hơn thực tế 1–2 °C.

## Cách hoạt động

Trong mạng Thread, thiết bị cắm điện đóng vai trò **Router** và luôn mở radio để chuyển tiếp gói cho hàng xóm. Thiết bị chạy pin thì ngược lại: nó đăng ký làm **Sleepy End Device**, chọn một Router làm "cha" (parent) và nhờ cha giữ hộ mọi gói tin gửi đến mình. Radio của SED tắt hoàn toàn, chỉ bật định kỳ để **poll** cha: "có gì cho tôi không?". Khoảng cách giữa hai lần poll gọi là **poll period** — firmware này đặt 5 giây theo mặc định của Matter cho thiết bị ngủ ngắn (SIT).

Giữa các lần poll, ESP32-H2 vào **light sleep tự động**: CPU và radio tắt, RAM vẫn giữ nên stack Thread và phiên Matter không phải thiết lập lại. Dòng tiêu thụ ở trạng thái này chỉ vài chục µA. Firmware không dùng deep sleep vì mỗi lần thức từ deep sleep sẽ phải gia nhập lại mạng Thread và mở lại phiên bảo mật với controller — tốn điện hơn nhiều so với ngủ nhẹ 60 giây.

Chu kỳ đo diễn ra như sau:

1. Mỗi **60 giây**, timer đánh thức chip; SHT40 được đọc ở chế độ độ chính xác cao (khoảng 10 ms, ±0,2 °C và ±1,8 %RH).
2. Nếu giá trị thay đổi đáng kể so với lần trước (hoặc đã quá 5 phút chưa báo), firmware cập nhật cluster **Temperature Measurement** và **Relative Humidity Measurement**; controller đang subscribe nhận report ở lần poll kế tiếp.
3. Mỗi 15 phút, cluster **Power Source** được cập nhật % pin (nếu bạn nối cầu chia ở GPIO1).
4. Chip ngủ tiếp.

Lúc chưa ghép nối, thiết bị quảng bá **BLE** để điện thoại tìm thấy; sau khi commissioning xong, BLE tắt cho đến khi reset về mặc định. Trong Apple Home, phụ kiện hiện thành hai ô "Nhiệt độ" và "Độ ẩm" trong cùng phòng, có cảnh báo pin yếu. Google Home hiện hai cảm biến tương tự. Home Assistant tạo ba entity: `sensor.*_temperature`, `sensor.*_humidity` và `sensor.*_battery`.

**Về thời lượng pin, hãy đọc kỹ đoạn này.** Con số phụ thuộc vào ba yếu tố: poll period (poll càng dày càng tốn), tần suất controller đọc dữ liệu (Home Assistant hỏi dồn dập hơn Apple Home), và chất lượng Border Router/cha Thread (tín hiệu yếu khiến chip phát lại nhiều lần, tốn gấp đôi gấp ba). Với 2 pin AA lithium, cấu hình mặc định và Border Router cùng tầng, kỳ vọng hợp lý là **từ vài tháng đến hơn một năm** — không phải con số chính xác. Pin alkaline sẽ ngắn hơn vì điện áp tụt dần: ESP32-H2 được đặc tả hoạt động từ 3,0 V, nên khi cặp pin xuống dưới mốc đó thiết bị có thể reset ngẫu nhiên dù pin "vẫn còn". Phương án CR123A + HT7333 giữ 3,3 V ổn định đến cuối, dễ đoán hơn nhưng pin đắt hơn.

## Nạp firmware

Mở trang firmware [MachNha Climate H2](/firmware/cam-bien-nhiet-am-pin-h2) và làm theo hai bước trên giao diện:

1. **Kết nối thiết bị.** Cắm DevKitM-1 vào máy tính bằng cáp USB-C truyền dữ liệu, vào cổng ghi *USB* (không phải *UART*). Bo dùng USB-JTAG tích hợp của chip nên Windows 10/11, macOS và Linux đều nhận ngay, **không cần cài driver**. Nhấn *Kết nối thiết bị*, chọn cổng "USB JTAG/serial debug unit" trong hộp thoại.
2. **Nạp firmware.** Trang tự nhận diện ESP32-H2 và chọn đúng bản build. Nhấn *Nạp firmware*, chờ khoảng 20–30 giây. Lần đầu nạp hoặc khi đổi từ dự án khác sang, chọn chế độ *Cài mới* để xoá sạch flash (bao gồm fabric Matter cũ).

Nếu bạn dùng module MINI-1 trên board tự hàn, cần mạch USB-UART rời (CP2102/CH340) và có thể phải vào bootloader bằng tay — xem [driver USB và chế độ boot](/huong-dan/driver-usb-va-che-do-boot). Trình duyệt phải là Chrome, Edge hoặc Arc trên máy tính; chi tiết ở [nạp firmware qua trình duyệt](/huong-dan/flash-qua-trinh-duyet), lỗi gặp phải tra ở [khắc phục lỗi flash](/huong-dan/khac-phuc-loi-flash).

Nạp xong, **mở Serial Monitor** (115200 baud) và nhấn RESET trên bo: log khởi động in mã QR dạng text, link render QR và mã ghép đôi 11 số. Chụp lại màn hình — bạn cần nó ở bước sau. Có thể tháo pin trong lúc nạp; lắp lại sau khi rút USB.

## Ghép nối

Firmware dùng **Test Vendor ID 0xFFF1** của Matter SDK, nên mọi ứng dụng sẽ cảnh báo "Phụ kiện chưa được chứng nhận". Đây là điều bình thường với thiết bị tự làm: chọn *Vẫn thêm* và tiếp tục. Điện thoại cần có Bluetooth và đang cùng mạng với Border Router. Hướng dẫn tổng quát ở [ghép đôi Matter](/huong-dan/ghep-doi-matter).

### Apple Home

Mở ứng dụng **Nhà** → dấu **+** → *Thêm phụ kiện* → quét mã QR từ Serial Monitor (hoặc *Tuỳ chọn khác* → *Nhập mã* và gõ 11 số). Chấp nhận cảnh báo chưa chứng nhận, chọn phòng, đặt tên cho từng cảm biến. Apple TV/HomePod tự cấp credentials Thread cho thiết bị, không cần cấu hình thêm. Toàn bộ mất 1–2 phút.

### Google Home

Mở **Google Home** → **+** → *Thiết bị* → *Thiết bị hỗ trợ Matter* → quét QR hoặc nhập mã thủ công. Cần Nest Hub (thế hệ 2), Nest Hub Max hoặc Nest Wifi Pro làm Border Router. Cảm biến hiện trong tab Thiết bị; để dùng trong automation nâng cao, mở trình soạn script trên web của Google Home.

### Home Assistant

Cần tích hợp **Matter** (Matter Server add-on) và một Thread Border Router mà HA biết credentials — dễ nhất là Home Assistant Connect ZBT-1/SkyConnect chạy firmware OpenThread RCP, hoặc dùng chung mạng Thread của Apple/Google qua tích hợp Thread. Trong app HA Companion: *Cài đặt* → *Thiết bị & dịch vụ* → *Thêm tích hợp* → *Matter* → quét QR. Chi tiết ở [Home Assistant với Matter](/huong-dan/home-assistant-matter).

## Sử dụng

Vài gợi ý automation thực tế:

- **Chống ẩm mốc:** độ ẩm phòng trên 70 % liên tục 30 phút → bật máy hút ẩm hoặc quạt thông gió qua ổ cắm Matter.
- **Phòng trẻ nhỏ:** nhiệt độ dưới 22 °C hoặc trên 28 °C → thông báo lên điện thoại, kết hợp bật/tắt điều hoà qua bộ phát hồng ngoại.
- **Tủ đồ, kho:** cảnh báo khi độ ẩm vượt 60 % để biết lúc cần thay gói hút ẩm.
- **Thống kê:** Home Assistant lưu lịch sử; thêm card biểu đồ 24 giờ để tìm giờ phòng nóng nhất và chỉnh lịch điều hoà.

Đặt cảm biến ở độ cao 1,2–1,5 m, tránh nắng chiếu trực tiếp, luồng gió điều hoà và tường ngoài; cách Border Router hoặc một thiết bị Thread cắm điện trong vòng một hai phòng. Nhà rộng thì một bóng đèn hoặc ổ cắm Matter over Thread cắm giữa đường sẽ làm Router trung gian, cảm biến tự chọn cha mới khi cần.

Mức pin đọc được ngay trong app: Apple Home hiện biểu tượng pin ở trang chi tiết phụ kiện và thông báo khi còn dưới 20 %; Home Assistant có entity battery để làm automation nhắc thay pin. Khi thay pin, thiết bị tự gia nhập lại mạng trong vài giây, không cần ghép nối lại.

## Khôi phục & reset

- **Reset về mặc định (factory reset):** giữ nút **BOOT** trên bo trong **10 giây** cho đến khi LED RGB nháy đỏ ba lần. Thiết bị xoá fabric Matter và credentials Thread, quay lại trạng thái quảng bá BLE chờ ghép nối. Nhớ xoá phụ kiện cũ trong app trước khi thêm lại.
- **Nạp lại sạch:** vào [trang firmware](/firmware/cam-bien-nhiet-am-pin-h2), nạp lại với chế độ *Cài mới* — tương đương reset mặc định kèm cập nhật firmware.
- **Chuyển sang hệ sinh thái khác:** không cần reset; dùng chức năng *chia sẻ/ghép đôi với hệ khác* trong app hiện tại để lấy mã mới, Matter cho phép nhiều fabric cùng lúc.

## Lỗi thường gặp

- **Không thấy cổng khi nhấn Kết nối thiết bị:** cắm nhầm cổng *UART* của DevKitM (cổng này cần driver CP2102) hoặc cáp chỉ sạc. Đổi sang cổng *USB* và cáp dữ liệu.
- **Log báo `SHT4x: no ack` hoặc giá trị 0:** đảo SDA–SCL, thiếu pull-up, hoặc breakout 5 V có mạch dịch mức không chạy ở 3,3 V. Đo bằng đồng hồ: SDA và SCL phải ở 3,3 V khi rảnh.
- **Ghép nối được nhưng vài phút sau "Không phản hồi":** thiết bị mất cha Thread — xa Border Router quá hoặc Border Router đang khởi động lại. Đưa lại gần, chờ 2–3 phút; nếu lặp lại, thêm một thiết bị Thread cắm điện làm Router trung gian.
- **Thiết bị reset ngẫu nhiên khi radio phát:** pin yếu hoặc thiếu tụ 100 µF. Đo điện áp 3V3 lúc hoạt động; dưới 3,0 V là lúc thay pin.
- **Chạy pin chỉ được vài tuần:** kiểm tra LED RGB đã tắt hẳn sau khi ghép nối chưa; xem HA có đang poll quá dày không; đưa Border Router gần hơn. Trên board breakout tự làm, nhớ bỏ đèn báo nguồn.
- **Apple Home báo "Không thể thêm phụ kiện" ngay sau khi quét:** fabric cũ còn trong flash. Reset mặc định bằng nút BOOT 10 giây hoặc nạp lại với *Cài mới*, rồi thử lại.

Thấy dự án hữu ích? Xem các dự án khác ở [danh mục dự án](/du-an) hoặc [mời mình một ly cà phê](/ung-ho) để duy trì máy chủ và mua linh kiện thử nghiệm.
