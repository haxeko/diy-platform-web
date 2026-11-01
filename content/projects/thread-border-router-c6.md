---
title: "Thread Border Router tự chế với một con ESP32-C6"
summary: "Chưa có Apple TV hay Nest Hub? Biến ESP32-C6-DevKitC-1 thành Thread Border Router chạy cạnh Wi-Fi nhà bạn (ESP-IDF OpenThread BR, Wi-Fi + 802.15.4 trên cùng một chip), đưa các node Thread của MachNha vào Home Assistant. Cắm USB là xong, không hàn."
protocol: "Thread"
chips: ["ESP32-C6"]
difficulty: "easy"
timeMinutes: 20
features:
  - "Một chip duy nhất: Wi-Fi 6 + Thread 802.15.4 trên ESP32-C6"
  - "Không hàn, chỉ cắm USB và cấp nguồn"
  - "Cấu hình Wi-Fi bằng điện thoại qua captive portal"
  - "Home Assistant tự phát hiện qua mDNS _meshcop._udp"
  - "REST API kiểu OTBR để quản lý Thread dataset"
  - "Reset về mặc định bằng nút BOOT"
bom:
  - { name: "ESP32-C6-DevKitC-1", qty: 1, note: "Bản N8 — 8 MB flash" }
  - { name: "Cáp USB-C có dữ liệu", qty: 1 }
  - { name: "Nguồn USB 5V 1A", qty: 1, note: "Củ sạc điện thoại ổn định" }
  - { name: "Anten ngoài 2.4 GHz", qty: 1, note: "Tuỳ chọn, chỉ cho bản có đầu U.FL" }
  - { name: "Vỏ in 3D có khe thoáng", qty: 1, note: "Tuỳ chọn" }
firmware: ["thread-border-router-c6"]
guides: ["bat-dau", "thread-border-router", "home-assistant-matter", "flash-qua-trinh-duyet", "driver-usb-va-che-do-boot"]
tags: ["thread", "border-router", "home-assistant", "openthread", "esp32-c6"]
accent: "graphite"
icon: "📡"
featured: true
mains: false
updatedAt: "2026-10-31"
---

## Giới thiệu

Thiết bị **Matter over Thread** (đèn, cảm biến của MachNha) không nói chuyện trực tiếp với Wi‑Fi. Chúng tạo mạng mesh 802.15.4 riêng và cần một **Thread Border Router** làm cầu nối sang mạng nhà — không có nó, điện thoại hay Home Assistant không nhìn thấy node nào. Bình thường vai trò này do Apple TV 4K, HomePod mini, Nest Hub (2nd gen) hoặc máy Home Assistant cắm dongle Connect ZBT‑1 (SkyConnect) đảm nhận.

Dự án này biến một bo **ESP32‑C6‑DevKitC‑1** giá vài trăm nghìn thành Border Router. Chip C6 có sẵn cả Wi‑Fi 6 và radio 802.15.4, nên một con chip làm được cả hai việc, không cần cặp S3 + H2 như bo **ESP Thread Border Router** tham chiếu của Espressif. Firmware dựa trên ví dụ OpenThread Border Router trong ESP‑IDF, chạy ở chế độ một chip (không có RCP rời).

Khi nào nên làm?

- Bạn dùng **Home Assistant** làm trung tâm và chưa muốn mua dongle riêng.
- Bạn muốn một Border Router thứ hai để **mở rộng tầm phủ** cho mesh Thread có sẵn.
- Bạn đang **học Thread/Matter** và cần nhìn thấy dataset, bảng hàng xóm, log — những thứ Apple TV không bao giờ cho xem.

Khi nào không nên? Nếu bạn chỉ dùng **Apple Home** hoặc **Google Home**: hai hệ này chỉ dùng Border Router của chính họ cho fabric của họ, nên BR tự chế không thay được Apple TV hay Nest Hub (xem [Thread và Border Router](/huong-dan/thread-border-router)). Và nếu cần độ ổn định 24/7 cho cả nhà, dongle ZBT‑1 + add-on OTBR trên Home Assistant vẫn là lựa chọn chắc tay hơn.

## Linh kiện

| Linh kiện | SL | Ghi chú |
| --- | --- | --- |
| ESP32‑C6‑DevKitC‑1 | 1 | Chọn bản **N8 (8 MB flash)**; bản 4 MB không đủ chỗ cho Wi‑Fi + OpenThread + web UI. |
| Cáp USB‑C có dữ liệu | 1 | Cáp sạc rẻ nhiều khi chỉ có dây nguồn, không flash được. |
| Nguồn USB 5 V 1 A | 1 | Củ sạc điện thoại ổn định là đủ; tránh cổng USB trên router hay TV vì có thể tắt theo thiết bị. |
| Anten ngoài 2.4 GHz (tuỳ chọn) | 1 | Chỉ khi bo của bạn là bản có đầu U.FL; bản anten PCB phổ biến không cần. |
| Vỏ in 3D có khe thoáng (tuỳ chọn) | 1 | Không bọc kín, không dùng vỏ kim loại. |

Tổng chi phí thấp hơn hẳn một dongle Thread, và bạn không cần hàn gì.

## Lắp đặt

Không có bước nối dây, nhưng **vị trí đặt** quyết định phần lớn chất lượng mesh:

1. Đặt BR **cách router Wi‑Fi ít nhất 1 m**. Router phát rất mạnh ngay sát bên, radio 802.15.4 của C6 sẽ "điếc" khi lắng nghe node Thread yếu ở xa.
2. Chọn **vị trí trung tâm** nhà, cao ngang tầm mắt, không giấu sau TV hay trong tủ kim loại. Node Thread cắm điện (đèn, ổ cắm) sẽ tự làm router nối dài, nhưng BR vẫn nên ở giữa.
3. Nếu dùng bản anten ngoài, dựng anten **thẳng đứng** và không để sát tường bê tông.
4. Cấp nguồn bằng củ sạc riêng, ổn định. BR phải chạy liên tục; mất điện là mất điều khiển từ app, dù mesh Thread vẫn tự giữ với nhau.
5. Vỏ in 3D: để hở hai cổng USB‑C và nút BOOT/RESET; chừa khe thoáng vì C6 chạy cả hai radio nên ấm hơn bình thường.

## Cách hoạt động

**Vai trò Border Router.** Mạng Thread là một mạng IPv6 riêng. Border Router có mặt ở cả hai bên: nó là một Router Thread bình thường (chuyển tiếp gói cho hàng xóm, có thể được bầu làm Leader) và đồng thời là một client Wi‑Fi trên mạng nhà. Nó định tuyến gói IPv6 giữa hai mạng, đăng ký dịch vụ của các node (SRP) lên **mDNS** để controller Matter tìm thấy chúng, và giữ **Operational Dataset** — tên mạng, kênh, PAN ID, Network Key — để đưa node mới vào mesh.

**Wi‑Fi và 802.15.4 trên cùng một chip.** ESP32‑C6 chỉ có **một bộ thu phát 2.4 GHz** dùng chung cho Wi‑Fi, BLE và 802.15.4. ESP‑IDF chia thời gian giữa hai giao thức (RF coexistence): khi Wi‑Fi truyền thì Thread chờ và ngược lại. Kết quả: dùng được, bật đèn từ Home Assistant vẫn phản hồi trong vài trăm mili‑giây, nhưng độ trễ và tỉ lệ mất gói cao hơn bo hai chip (S3 lo Wi‑Fi, H2 lo Thread). Vì vậy Espressif vẫn khuyến nghị bo hai chip cho sản phẩm thương mại; bản một chip C6 hợp với nhà nhỏ, vài chục node và người thích tự làm. Firmware tắt Wi‑Fi power‑save để radio luôn sẵn sàng.

**Khai báo trên mạng LAN.** Sau khi lên Wi‑Fi, BR quảng bá dịch vụ **`_meshcop._udp`** qua mDNS kèm tên mạng Thread, Extended PAN ID và trạng thái. Tích hợp **Thread** của Home Assistant lắng nghe đúng dịch vụ này nên BR tự xuất hiện trong mục *Đã phát hiện*. Firmware cũng mở **REST API kiểu OTBR** (cổng 8081) để tích hợp *Open Thread Border Router* đọc/ghi dataset và tạo mạng mới.

**Giới hạn cần biết trước:**

- Băng thông Thread vốn thấp (250 kbit/s) và còn phải chia radio với Wi‑Fi — hợp với công tắc, cảm biến, đèn; không hợp với camera hay audio.
- Chỉ **một** radio: khi Wi‑Fi nhà bận (tải phim, họp video) Thread sẽ chậm lại theo.
- **Không dùng được cho fabric Apple Home / Google Home.** Apple yêu cầu Apple TV hoặc HomePod làm Border Router; Google tương tự với Nest. BR này phục vụ Home Assistant, Matter Server và các công cụ DIY. Từ Thread 1.3 nó *có thể* cùng một mesh với Apple TV nếu dùng chung dataset, nhưng Apple Home vẫn chỉ đi qua BR của họ.

## Nạp firmware

Firmware nằm ở [/firmware/thread-border-router-c6](/firmware/thread-border-router-c6). Quy trình 2 bước:

1. **Kết nối thiết bị.** Cắm DevKitC‑1 vào máy tính bằng cáp dữ liệu. Bo có **hai cổng USB‑C**: cổng ghi **USB** (USB‑JTAG gốc, không cần driver, hiện là *USB JTAG/serial debug unit*) hoặc cổng **UART** (qua CP2102N) đều flash được; cổng USB tiện hơn. Mở trang bằng Chrome hoặc Edge, nhấn **Kết nối thiết bị**, chọn cổng. Thẻ chip phải hiện **ESP32‑C6** và **dung lượng flash 8 MB** — firmware yêu cầu tối thiểu 8 MB, bản 4 MB sẽ bị chặn trước khi ghi.
2. **Nạp firmware.** Lần đầu chọn **Cài mới — xoá toàn bộ** để NVS sạch. Nhấn Nạp, chờ thanh tiến trình chạy hết ba phần (bootloader, partition table, app) rồi bo tự khởi động lại. Không rút cáp giữa chừng.

Không kết nối được hay báo lỗi MD5: xem [Driver USB, cáp và chế độ bootloader](/huong-dan/driver-usb-va-che-do-boot) và [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash). Ý nghĩa từng trạng thái của trình nạp ở [Flash qua trình duyệt](/huong-dan/flash-qua-trinh-duyet).

## Cấu hình Wi‑Fi lần đầu

Firmware không chứa mật khẩu Wi‑Fi; bạn nhập bằng điện thoại:

1. Cấp nguồn, chờ khoảng 10 giây. LED trên bo **nhấp nháy vàng** nghĩa là chưa có Wi‑Fi, BR đang mở điểm phát riêng.
2. Trên điện thoại, vào Wi‑Fi và nối với mạng tên **`MachNha-BR-xxxx`** (xxxx là 4 ký tự cuối địa chỉ MAC; tên có thể khác chút theo phiên bản firmware, cứ tìm mạng bắt đầu bằng *MachNha*). Mạng này không có mật khẩu và chỉ tồn tại khi chưa cấu hình.
3. Điện thoại thường tự mở trang đăng nhập (captive portal). Nếu không, mở trình duyệt và vào **`http://192.168.4.1`**.
4. Chọn Wi‑Fi nhà (băng **2.4 GHz** — C6 không có 5 GHz), nhập mật khẩu, nhấn **Lưu**. BR khởi động lại, LED **nhấp nháy xanh dương** khi đang nối Wi‑Fi và **xanh lá ổn định** khi đã lên mạng và Thread đang chạy.
5. Web UI của BR vẫn truy cập được qua địa chỉ IP mà router cấp (xem trong trang quản trị router, hoặc `machnha-br.local` nếu máy bạn hỗ trợ mDNS); ở đó có dataset và danh sách node.

Nếu mật khẩu sai, BR quay lại chế độ điểm phát sau khoảng một phút — làm lại từ bước 2.

## Đưa vào Home Assistant

### Home Assistant

1. Vào **Cài đặt → Thiết bị & dịch vụ**. Nếu HA cùng mạng LAN, mục *Đã phát hiện* sẽ hiện **Thread** với tên MachNha BR — nhấn **Cấu hình**. Chưa có tích hợp Thread thì thêm thủ công: *Thêm tích hợp → Thread*.
2. Để HA quản lý dataset, thêm tích hợp **Open Thread Border Router** và nhập URL `http://<ip-của-BR>:8081`.
3. Trong **Thread → Cấu hình**, bạn thấy mạng do BR tạo. Nếu đây là Border Router đầu tiên, đánh dấu nó là **Preferred network**. Nếu đã có mạng Thread khác (ZBT‑1, Apple TV…), chọn **thêm Border Router vào mạng ưu tiên** để BR nhập dataset có sẵn thay vì tạo mạng mới — chỉ nên có một mạng Thread trong nhà.
4. Đảm bảo **Matter Server** đã cài; từ đây HA ghép node Matter over Thread qua BR này như mọi Border Router khác.

Chi tiết về Matter Server và chia sẻ credentials với điện thoại ở [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter).

### Ghép nối node Thread qua Home Assistant Companion app

1. Mở **Companion app** trên điện thoại, vào **Cài đặt → Thiết bị & dịch vụ → Thêm thiết bị → Thêm thiết bị Matter**.
2. Quét mã QR Matter trên node (đèn Matter C6 của MachNha in mã ra serial log, trang firmware hiển thị lại) hoặc nhập mã ghép đôi 11 số.
3. Điện thoại nối với node qua BLE, HA gửi dataset của BR xuống và node tham gia mesh. Vài giây sau node xuất hiện trong HA, và web UI của BR có thêm một hàng xóm mới.

Điện thoại phải cùng Wi‑Fi với HA và BR. Đừng ghép cùng node vào Apple Home trước rồi mong nó dùng BR này — mỗi fabric đi qua Border Router của hệ đó.

## Sử dụng & theo dõi

**Đèn LED RGB trên bo:**

| LED | Ý nghĩa |
| --- | --- |
| Nhấp nháy vàng | Chưa có Wi‑Fi, đang mở điểm phát `MachNha-BR-xxxx` |
| Nhấp nháy xanh dương | Đang kết nối Wi‑Fi |
| Xanh lá ổn định | Wi‑Fi đã lên, Thread đang chạy (Router hoặc Leader) |
| Nhấp nháy đỏ | Mất Wi‑Fi hoặc Thread tách mạng; tự thử lại |
| Nháy tím nhanh | Đang xoá về mặc định |

**Kiểm tra node:** web UI của BR liệt kê vai trò hiện tại và bảng hàng xóm (RLOC16, RSSI). Trong HA, **Thread → Cấu hình** cho biết Border Router nào đang online, còn trang thiết bị Matter hiện *network type: Thread*. Quen dòng lệnh thì mở console serial 115200 baud và gõ lệnh OpenThread CLI như `state`, `neighbor table`, `dataset active`.

**Cập nhật:** quay lại trang firmware, chọn **Cập nhật — giữ Wi‑Fi/ghép nối** để nạp bản mới mà không mất dataset; node Thread không cần ghép lại.

## Khôi phục & reset

- **Xoá Wi‑Fi và dataset:** giữ nút **BOOT** trong **10 giây** khi bo đang chạy (không phải lúc cắm điện). LED nháy tím nhanh rồi bo khởi động lại ở chế độ điểm phát. Node Thread đã ghép sẽ mất mạng — nếu đây là BR duy nhất, bạn phải ghép lại chúng, vì vậy hãy xem lại dataset trong HA trước.
- **Nạp lại từ đầu:** vào [/firmware/thread-border-router-c6](/firmware/thread-border-router-c6), chọn **Cài mới — xoá toàn bộ**. Tương đương reset cứng, dùng khi bo treo hoặc muốn đổi sang dự án khác.
- **Chỉ đổi Wi‑Fi:** không cần reset, vào web UI của BR → *Wi‑Fi* → nhập mạng mới.

## Lỗi thường gặp

- **Không thấy mạng `MachNha-BR-xxxx`.** Chờ đủ 10–15 giây sau khi cấp nguồn; nếu LED đã xanh lá thì BR đã có Wi‑Fi từ trước — giữ BOOT 10 giây để xoá. Một số điện thoại ẩn mạng không mật khẩu, kéo xuống làm mới danh sách.
- **Nối được AP nhưng không mở được 192.168.4.1.** Tắt dữ liệu di động tạm thời, điện thoại hay ưu tiên 4G khi AP không có Internet. Gõ `http://`, không phải `https://`.
- **Home Assistant không phát hiện BR.** HA và BR phải cùng subnet; mDNS không đi qua VLAN hay chế độ *AP isolation* của router. Thêm thủ công tích hợp Open Thread Border Router bằng IP.
- **Node ghép được nhưng phản hồi chậm hoặc rớt.** Dời BR xa router Wi‑Fi hơn, đổi kênh Thread sang 25 hoặc 26 nếu Wi‑Fi nhà ở kênh 1–6, thêm một node cắm điện làm router trung gian. Xem mẹo tầm phủ ở [Thread và Border Router](/huong-dan/thread-border-router).
- **Trình nạp báo flash 4 MB.** Bạn cầm bản N4; firmware cần N8. Kiểm tra tem trên module: `ESP32-C6-WROOM-1-N8`.
- **Hai mạng Thread trong HA.** BR tạo mạng mới thay vì nhập mạng cũ. Vào Thread → Cấu hình, chọn mạng ưu tiên rồi *thêm Border Router vào mạng ưu tiên*, hoặc reset BR và làm lại sau khi đã đặt Preferred network.

Dự án khác dùng Thread ở [/du-an](/du-an). Thấy hữu ích? Mời MachNha một ly cà phê tại [/ung-ho](/ung-ho).
