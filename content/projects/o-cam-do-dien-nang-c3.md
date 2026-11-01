---
title: "Ổ cắm thông minh đo điện năng Matter over Wi-Fi với ESP32-C3 + BL0942"
summary: "Ổ cắm bật/tắt từ xa, đo công suất, điện áp, dòng và năng lượng tích luỹ bằng IC BL0942 (UART); hiện trong Apple Home là ổ cắm, trong Home Assistant có đủ sensor điện năng (Matter 1.3 Electrical Measurement). Kèm hiệu chuẩn bằng bóng đèn sợi đốt. Dự án điện lưới 220 V."
protocol: "Matter over Wi-Fi"
chips: ["ESP32-C3"]
difficulty: "hard"
timeMinutes: 180
features:
  - "Bật/tắt từ xa qua Matter over Wi-Fi, không cần cloud"
  - "Đo công suất, điện áp, dòng điện và kWh tích luỹ"
  - "Sensor điện năng trong Home Assistant (Matter 1.3)"
  - "Hiệu chuẩn bằng bóng đèn sợi đốt, hệ số lưu trong NVS"
  - "Nút nhấn tại chỗ, LED trạng thái, relay 16 A"
  - "Cầu chì 10 A, varistor và vỏ chống cháy"
bom:
  - { name: "Module ESP32-C3-MINI-1 (hoặc board ESP32-C3 Super Mini)", qty: 1, note: "Super Mini có USB-C và LDO 3,3 V sẵn, dễ nạp firmware hơn" }
  - { name: "IC đo điện BL0942", qty: 1, note: "Giao tiếp UART, đo V/I/P/kWh" }
  - { name: "Shunt 1 mΩ 2 W", qty: 1, note: "Hợp kim manganin, chịu từ 16 A trở lên" }
  - { name: "Trở chia áp 390 kΩ", qty: 5, note: "Mắc nối tiếp thành chuỗi ~1,95 MΩ cho ngõ đo điện áp" }
  - { name: "Relay 16 A 5 V Hongfa HF32FA-G", qty: 1, note: "Kèm transistor NPN hoặc MOSFET, diode 1N4007 và trở 1 kΩ để lái cuộn" }
  - { name: "Nguồn HLK-PM01 220 V → 5 V", qty: 1, note: "~3 W, đủ cho ESP32-C3 và cuộn relay" }
  - { name: "Vỏ ổ cắm rời 16 A có cầu chì 10 A", qty: 1, note: "Nhựa chống cháy, có chỗ gắn mạch" }
  - { name: "Varistor 10D471K", qty: 1, note: "Mắc song song L–N, sau cầu chì" }
  - { name: "Nút nhấn + LED trạng thái", qty: "1 bộ", note: "LED kèm trở 1 kΩ" }
  - { name: "Linh kiện phụ", qty: "1 bộ", note: "Tụ 100 nF, 10 µF, 470 µF; trở 1 kΩ; LDO 3,3 V nếu dùng module rời" }
firmware: ["o-cam-do-dien-nang-c3"]
guides: ["bat-dau", "flash-qua-trinh-duyet", "driver-usb-va-che-do-boot", "ghep-doi-matter", "home-assistant-matter"]
tags: ["matter", "wi-fi", "ổ cắm", "điện năng", "220V", "bl0942"]
accent: "rose"
icon: "🔌"
featured: false
mains: true
updatedAt: "2026-10-31"
---

## Giới thiệu

Ổ cắm thông minh mua sẵn thường đo điện rất ổn, nhưng số liệu đi qua cloud của hãng và hiếm khi lộ ra qua Matter. Dự án này tự làm một ổ cắm **Matter over Wi-Fi** bằng ESP32-C3 và IC đo điện **BL0942** — con chip quen mặt trong nhiều ổ cắm Tuya/Athom. Kết quả: trong Apple Home bạn có một ổ cắm bật/tắt bình thường; trong Home Assistant có thêm sensor công suất (W), điện áp (V), dòng (A) và năng lượng tích luỹ (kWh) để đưa vào Energy Dashboard, hoàn toàn nội bộ.

Đây là dự án **khó** và **chạm trực tiếp vào điện lưới 220 V**. Phần đo điện của BL0942 không cách ly với lưới, nên toàn bộ mạch — kể cả ESP32-C3 — nằm ở điện áp nguy hiểm khi đang hoạt động. Nếu bạn chưa từng làm mạch nối với điện lưới, hãy bắt đầu với một dự án chạy pin/USB trong mục [Dự án](/du-an) rồi quay lại sau.

## An toàn điện 220 V

> **Đọc hết trước khi cầm mỏ hàn.**
>
> - **Ngắt cầu dao** (không chỉ rút phích) trước khi chạm vào mạch, rồi dùng **bút thử điện** kiểm tra lại cả dây L và N.
> - Phần đo điện (BL0942, shunt, chuỗi trở chia áp) **không cách ly** với lưới. GND của mạch nối thẳng vào dây lưới qua shunt, nên **toàn bộ mạch là mạch "nóng"** — kể cả chân USB và vỏ kim loại của board, dù HLK-PM01 bản thân nó là nguồn cách ly.
> - **Tuyệt đối không cắm USB vào board khi mạch đang nối 220 V.** Làm vậy có thể đưa điện lưới vào máy tính và vào tay bạn. Chỉ nạp firmware, đọc Serial Monitor khi mạch đã **ngắt hoàn toàn** khỏi lưới và đã chờ vài chục giây cho tụ xả.
> - Bắt buộc có **cầu chì 10 A**, **varistor 10D471K**, vỏ nhựa **chống cháy** đóng kín, dây dẫn đường tải **tiết diện tối thiểu 1,5 mm²**, mối hàn phủ keo cách điện.
> - Dự án **chỉ dành cho người đã có kinh nghiệm với điện lưới**. Bạn tự chịu trách nhiệm về an toàn của mình và người trong nhà; MachNha không chịu trách nhiệm cho thiệt hại phát sinh.

Vài quy tắc làm việc: lắp mạch vào vỏ và đóng nắp **trước** khi cấp điện lần đầu; đặt ổ cắm xa tầm tay trẻ em; nếu ngửi mùi khét, nghe tiếng nổ nhỏ hay relay nóng bất thường — ngắt điện ngay và kiểm tra lại từ đầu.

## Linh kiện

| Linh kiện | SL | Ghi chú |
| --- | --- | --- |
| Module ESP32-C3-MINI-1 hoặc board ESP32-C3 Super Mini | 1 | Super Mini có USB và LDO 3,3 V sẵn; module rời cần thêm LDO 3,3 V và adapter USB-UART ngoài |
| IC đo điện BL0942 | 1 | Nguồn 3,3 V, giao tiếp UART, đo V/I/P/kWh và tần số lưới |
| Shunt 1 mΩ 2 W | 1 | Loại hợp kim manganin; ở 16 A tổn hao chỉ khoảng 0,25 W |
| Trở 390 kΩ | 5 | Nối tiếp thành ~1,95 MΩ cho ngõ đo điện áp; dùng cỡ 1206 hoặc 0,25 W trở lên để chịu áp |
| Relay Hongfa HF32FA-G 5 V 16 A | 1 | Kèm transistor NPN (S8050) hoặc MOSFET, diode 1N4007 song song cuộn, trở 1 kΩ ở chân điều khiển |
| Nguồn HLK-PM01 220 V → 5 V | 1 | Khoảng 3 W; đủ cho ESP32-C3 lúc phát Wi-Fi cộng cuộn relay |
| Vỏ ổ cắm rời 16 A có cầu chì 10 A | 1 | Nhựa chống cháy, chọn loại có rãnh gắn PCB |
| Varistor 10D471K | 1 | Song song L–N, đặt sau cầu chì |
| Nút nhấn + LED trạng thái | 1 bộ | LED kèm trở 1 kΩ; nút loại cách điện nếu lộ ra ngoài vỏ |
| Linh kiện phụ | 1 bộ | Tụ 100 nF, 10 µF, 470 µF; trở lọc theo datasheet BL0942; LDO 3,3 V nếu dùng module rời |

Các giá trị trở/tụ quanh BL0942 nên lấy đúng theo sơ đồ tham chiếu trong datasheet; bài này chỉ nêu các linh kiện chính.

## Nối dây

Mạch gồm ba khối: **khối nguồn** (cầu chì → varistor → HLK-PM01 → 5 V cho relay và LDO 3,3 V), **khối đo** (BL0942, shunt, chuỗi chia áp) và **khối điều khiển** (ESP32-C3, relay, nút, LED). Theo thiết kế tham chiếu của BL0942, **shunt 1 mΩ nằm nối tiếp trên đường dây đi qua ổ cắm** (thường là dây N; dây L qua tiếp điểm relay), hai đầu shunt vào ngõ dòng của IC qua trở lọc nhỏ. **Chuỗi 5 × 390 kΩ** đi từ dây lưới còn lại tới ngõ điện áp, với một trở nhỏ xuống GND tạo thành cầu chia áp. GND của BL0942, của HLK-PM01 và của ESP32-C3 là **một điểm chung nối với một đầu shunt** — tức là nối thẳng vào dây lưới.

| Chân ESP32-C3 | Nối tới | Ghi chú |
| --- | --- | --- |
| GPIO6 (UART1 RX) | BL0942 TX | Chéo TX–RX; firmware mặc định 4800 baud |
| GPIO7 (UART1 TX) | BL0942 RX | Có thể bỏ trở kéo, BL0942 chạy 3,3 V như ESP32-C3 |
| GPIO4 | Chân điều khiển relay (qua transistor/driver) | GPIO không lái trực tiếp cuộn 5 V; dùng transistor NPN hoặc MOSFET, diode 1N4007 song song cuộn |
| GPIO5 | Nút nhấn | Nối xuống GND, dùng pull-up nội; nhấn ngắn bật/tắt, giữ 10 giây để reset |
| GPIO3 | LED trạng thái | Qua trở 1 kΩ xuống GND |
| 3V3 | VDD của BL0942 | Từ LDO 3,3 V sau HLK-PM01 (Super Mini đã có LDO) |
| 5V | HLK-PM01 OUT+ | Cấp cho cuộn relay và ngõ vào LDO |
| GND | HLK-PM01 OUT−, GND BL0942, một đầu shunt | **GND này nối thẳng với dây lưới — toàn mạch "nóng"**, không chạm vào khi còn điện |

Tránh dùng **GPIO8 và GPIO9** (chân strapping quyết định chế độ boot) cho relay hay nút; GPIO2 cũng là chân strapping. Trên Super Mini, GPIO18/19 dành cho USB native và GPIO20/21 là UART0 dùng để nạp/log, nên để trống. Dây L và N vào ổ cắm dùng dây 1,5 mm² hoặc hơn, siết chặt vào cọc đồng của vỏ; không hàn trực tiếp dây tải lên PCB mỏng.

## Cách hoạt động

**BL0942** là IC đo điện một pha. Nó lấy mẫu điện áp (qua cầu chia áp) và dòng điện (qua shunt), rồi tính sẵn các giá trị RMS và công suất thực. Firmware nói chuyện với nó qua **UART ở 4800 baud** (một số module cấu hình 9600): ESP32-C3 gửi lệnh đọc, chip trả về gói khoảng 23 byte kèm checksum chứa dòng RMS, điện áp RMS, công suất thực (có dấu), bộ đếm xung năng lượng và tần số lưới. Các con số này là **giá trị thô**, phụ thuộc vào shunt và cầu chia áp, nên phải nhân với hệ số hiệu chuẩn mới ra V, A, W thật — đó là lý do có mục Hiệu chuẩn bên dưới. Năng lượng tích luỹ được tính từ bộ đếm xung và lưu định kỳ vào NVS để không mất khi cúp điện.

Về phía **Matter**, firmware dựng trên esp-matter với hai phần: thiết bị **On/Off Plug-in Unit** (cluster OnOff) và phần đo điện dùng hai cluster mới của **Matter 1.3** là **Electrical Power Measurement** (điện áp, dòng, công suất tức thời) và **Electrical Energy Measurement** (kWh tích luỹ). Mức hỗ trợ ở phía controller khác nhau: tính đến thời điểm viết bài (cuối 2026), **Apple Home chỉ hiển thị ổ cắm bật/tắt**, chưa hiện số liệu điện; **Google Home** cũng chủ yếu dừng ở bật/tắt và có thể thay đổi theo phiên bản app; **Home Assistant** đọc đầy đủ cả hai cluster thành sensor. Nếu mục tiêu chính của bạn là xem điện năng, hãy coi Home Assistant là nơi dùng chính.

**Relay** được GPIO4 lái qua transistor; firmware ghi nhớ trạng thái và khôi phục sau mất điện. **Nút nhấn** ở GPIO5: nhấn ngắn đảo trạng thái relay (thay đổi được đồng bộ về app), giữ 10 giây để reset về mặc định. **LED** nhấp nháy chậm khi chờ ghép nối, nhấp nháy nhanh khi đang kết nối Wi-Fi, sáng ổn định khi relay đóng và tắt khi relay mở.

## Hiệu chuẩn

Dù lắp đúng sơ đồ, sai số shunt và trở chia áp vẫn khiến số đo lệch 5–15 %. Cách hiệu chuẩn rẻ nhất: một **bóng đèn sợi đốt 60 W** (tải thuần trở, hệ số công suất xấp xỉ 1) và một **đồng hồ vạn năng** đo được điện áp AC.

Để không bao giờ phải cắm USB vào mạch đang có điện, hãy chia làm hai pha:

1. **Pha đo (có 220 V, không USB).** Ổ cắm đã lắp kín trong vỏ và đã ghép với Home Assistant. Cắm bóng 60 W, bật relay, chờ một phút cho bóng ổn định. Ghi lại điện áp, dòng và công suất mà ổ cắm báo trong Home Assistant. Cùng lúc, đo điện áp lưới thật bằng đồng hồ tại một ổ cắm khác trên cùng đường dây. Nếu có ampe kìm, kẹp đo dòng thật; nếu không, lấy công suất danh định 60 W làm tham chiếu (sai số vài phần trăm là chấp nhận được cho ổ cắm gia đình).
2. **Pha nhập hệ số (không 220 V, có USB).** Ngắt cầu dao, rút ổ cắm, chờ 30 giây, mở vỏ và cắm USB. Mở Serial Monitor ở 115200 baud: firmware in ra **bản đọc hiện tại và các hệ số đang dùng** cho điện áp, dòng và công suất. Hệ số mới = giá trị thật ÷ giá trị firmware báo (ví dụ đồng hồ đo 228 V, firmware báo 241 V thì hệ số điện áp là 228/241). Nhập hệ số qua lệnh trong Serial Monitor; firmware lưu vào **NVS**, giữ nguyên khi nạp lại firmware bình thường và chỉ mất khi bạn xoá toàn bộ flash. Danh sách lệnh chính xác nằm trong changelog của firmware tại [/firmware/o-cam-do-dien-nang-c3](/firmware/o-cam-do-dien-nang-c3).

Lắp lại, cấp điện và lặp lại pha đo một lần nữa để kiểm tra; nếu muốn kiểm tra tuyến tính, thử thêm một tải lớn hơn như bàn là khoảng 1000–1500 W. Người có kinh nghiệm có thể dùng **bộ cách ly USB** (loại dựa trên ADuM3160/ADuM4160) và laptop chạy pin để đọc Serial Monitor khi mạch có điện — nhưng đây là lựa chọn nâng cao, chúng tôi không khuyến khích cho lần làm đầu.

## Nạp firmware

Firmware nằm ở [/firmware/o-cam-do-dien-nang-c3](/firmware/o-cam-do-dien-nang-c3) và nạp ngay trong trình duyệt Chrome/Edge qua Web Serial — xem [Flash qua trình duyệt](/huong-dan/flash-qua-trinh-duyet). **Chỉ nạp khi board hoàn toàn rời khỏi mạch 220 V** — tốt nhất là nạp xong trên bàn rồi mới lắp vào vỏ.

1. **Kết nối board.** Với ESP32-C3 Super Mini, cắm thẳng cáp USB-C. Với module ESP32-C3-MINI-1 rời, dùng adapter USB-UART 3,3 V nối vào GPIO20 (RX) / GPIO21 (TX) và GND, giữ GPIO9 xuống GND khi cấp nguồn để vào bootloader. Chưa thấy cổng COM: đọc [Driver USB và chế độ boot](/huong-dan/driver-usb-va-che-do-boot).
2. **Flash.** Mở trang firmware, nhấn **Kết nối & Flash**, chọn cổng trong hộp thoại của trình duyệt và chờ thanh tiến trình chạy hết ba phần (bootloader, partition table, app). Lần đầu nạp lên một board từng chạy firmware khác, bật **Xoá toàn bộ flash trước khi ghi**. Nếu lỗi ở 460800 baud, hạ xuống 115200 và thử lại; thêm gợi ý trong [Khắc phục lỗi flash](/huong-dan/khac-phuc-loi-flash).

Sau khi flash, giữ cáp USB thêm một lúc để ghép nối ngay trên bàn (mục dưới), rồi rút USB, lắp vào vỏ, đóng nắp và mới cấp 220 V.

## Ghép nối

ESP32-C3 chạy được chỉ bằng 5 V từ USB, nên **hãy ghép nối ngay trên bàn khi chưa có 220 V**: khi khởi động, firmware in ra Serial Monitor đường dẫn mã QR và mã thủ công. Bản firmware này dùng **Test VID 0xFFF1** (PID 0x8001) của Matter nên các app sẽ cảnh báo thiết bị chưa được chứng nhận — bình thường với firmware tự làm. Mã QR dự phòng là `MT:Y.K9042C00KA0648G00`, mã thủ công **3497-011-2332** (nhập `34970112332`). Vì mọi board chạy cùng bản demo dùng chung mã, mỗi lần chỉ ghép một thiết bị. Chi tiết từng bước và cách chia sẻ sang hệ sinh thái thứ hai: [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).

### Apple Home

Mở app Nhà → **+** → **Thêm phụ kiện** → quét QR hoặc chọn *Tuỳ chọn khác* để nhập mã thủ công. Khi hiện cảnh báo *Phụ kiện chưa được chứng nhận*, chọn **Vẫn thêm**. Thiết bị xuất hiện dạng ổ cắm có bật/tắt, dùng được trong tự động hoá và Siri; số liệu W/kWh không hiển thị trong app Nhà.

### Google Home

Google Home → **+** → **Thiết bị** → **Thiết bị Matter** → quét QR. Với Test VID, Google có thể từ chối trừ khi bạn đã khai báo VID/PID trong Google Home Developer Console; cách làm có trong bài hướng dẫn ghép đôi. Mức hiển thị điện năng trong Google Home thay đổi theo phiên bản, đừng kỳ vọng.

### Home Assistant

Cần add-on Matter Server và tích hợp Matter — xem [Home Assistant với Matter](/huong-dan/home-assistant-matter). Từ Companion app trên điện thoại: **Cài đặt → Thiết bị & dịch vụ → Thêm tích hợp → Matter** → quét QR. Thiết bị hiện một switch cùng các sensor điện áp, dòng, công suất và năng lượng. Nếu đã ghép với Apple Home trước, dùng tính năng *Bật chế độ ghép nối* trong app Nhà để lấy mã mới rồi thêm vào Home Assistant mà không cần reset.

## Sử dụng

- **Energy Dashboard:** Cài đặt → Bảng điều khiển → Năng lượng → *Thiết bị riêng lẻ* → chọn sensor năng lượng (kWh) của ổ cắm. Sau một ngày bạn sẽ thấy biểu đồ tiêu thụ theo giờ của thiết bị cắm vào.
- **Tự tắt khi tải đã xong:** automation với điều kiện *công suất dưới 5 W trong 10 phút* → tắt relay. Hợp với sạc xe đạp điện, sạc laptop; đồng thời dùng được để báo "máy giặt đã xong" khi công suất rơi về gần 0.
- **Cảnh báo quá tải:** cầu chì 10 A tương ứng khoảng 2200 W, nên đặt ngưỡng **công suất trên 2000 W** → gửi thông báo và tắt relay. Dù relay chịu 16 A, hãy coi 2000 W là giới hạn liên tục của ổ cắm này.
- **Theo dõi điện áp lưới:** sensor điện áp giúp phát hiện điện yếu/quá áp giờ cao điểm; tạo cảnh báo khi ra ngoài khoảng 200–245 V.
- **Báo mất kết nối:** automation khi thực thể chuyển sang *unavailable* quá 5 phút, để biết ổ cắm bị rút hay Wi-Fi gặp sự cố.

## Khôi phục & reset

- **Reset về mặc định:** giữ nút **BOOT** (GPIO9) — hoặc nút nhấn ở GPIO5 — trong **10 giây** cho tới khi LED nhấp nháy nhanh. Thiết bị xoá fabric Matter và cấu hình Wi-Fi rồi quay lại chế độ chờ ghép nối; hệ số hiệu chuẩn vẫn giữ. Làm việc này khi mạch đã rút khỏi lưới và cấp nguồn bằng USB; nút lộ ra ngoài vỏ phải là loại cách điện.
- **Nạp lại với "Cài mới":** vào trang firmware, bật **Xoá toàn bộ flash trước khi ghi** rồi flash lại. Cách này xoá sạch NVS, kể cả hệ số hiệu chuẩn — ghi lại hệ số trước khi làm.
- Trước khi ghép lại, xoá thiết bị khỏi app cũ để tránh trùng tên; nếu app báo "thiết bị đã thuộc fabric khác", reset như trên là đủ.

## Lỗi thường gặp

- **Số đo luôn bằng 0:** TX/RX đảo chiều (TX của BL0942 phải vào GPIO6), sai baud 4800/9600, hoặc BL0942 chưa có 3,3 V. Khi chạy bằng USB không có 220 V, số đo bằng 0 là bình thường.
- **Công suất âm:** hai đầu shunt đảo chiều so với sơ đồ, hoặc L/N vào ngược. Đổi hai đầu shunt (khi đã ngắt điện) là cách sửa đúng.
- **Số liệu lệch 5–20 %:** chưa hiệu chuẩn hoặc đồng hồ không đo RMS thật; làm lại mục Hiệu chuẩn với tải thuần trở.
- **Apple Home không có W/kWh:** đúng như mô tả — Apple chưa hiển thị cluster đo điện; dùng Home Assistant.
- **ESP32-C3 khởi động lại khi relay đóng:** sụt áp tức thời trên nguồn 5 V; thêm tụ 470 µF ở ngõ ra HLK-PM01 và kiểm tra diode 1N4007 song song cuộn relay.
- **Wi-Fi chập chờn hoặc không ghép được:** ESP32-C3 chỉ hỗ trợ 2,4 GHz; tránh đặt antenna sát relay hay kim loại; với lỗi "Phụ kiện không được hỗ trợ", xem phần Test VID trong [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).

Dự án hữu ích? MachNha chạy bằng tiền cà phê của cộng đồng — ghé [Ủng hộ](/ung-ho) hoặc kể cho một người bạn làm maker.
