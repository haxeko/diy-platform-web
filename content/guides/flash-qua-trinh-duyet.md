---
title: "Nạp firmware ngay trên trình duyệt (Web Serial)"
summary: "Trình duyệt nào hỗ trợ, từng trạng thái trong quá trình flash có nghĩa gì, khi nào chỉnh baud hay xoá toàn bộ flash, kiểm tra MD5 là gì và firmware được bảo vệ ra sao."
category: "flash"
order: 20
projects: []
updatedAt: "2026-10-31"
---

## Web Serial là gì và vì sao không cần cài phần mềm

Trình flash của trang dùng **Web Serial API** — một API của trình duyệt cho phép trang web (sau khi bạn cho phép) mở cổng nối tiếp USB. Bên dưới, trang chạy [esptool-js](https://github.com/espressif/esptool-js), bản JavaScript của công cụ esptool chính thức của Espressif. Kết quả: không cần Arduino IDE, Python hay esptool trên máy; chỉ cần một trình duyệt và một cáp USB.

### Trình duyệt hỗ trợ

| Trình duyệt | Hỗ trợ |
| --- | --- |
| Chrome, Edge, Opera, Arc, Brave trên Windows / macOS / Linux / ChromeOS | Có |
| Chrome trên Android | Chưa — Web Serial chưa có trên di động |
| Safari (macOS, iOS, iPadOS) | Chưa hỗ trợ |
| Firefox | Chưa hỗ trợ |

Nếu bạn thấy thông báo "Trình duyệt chưa hỗ trợ Web Serial", hãy mở lại trang bằng một trình duyệt nhân Chromium trên máy tính.

### Yêu cầu HTTPS

Web Serial chỉ hoạt động trong **secure context**: địa chỉ `https://` hoặc `http://localhost`. Nếu bạn tự host bản sao của trang qua HTTP thường trong mạng LAN, nút Kết nối sẽ bị mờ. Hãy dùng HTTPS (reverse proxy, Cloudflare Tunnel, mkcert…) hoặc mở từ chính máy đang chạy dev server.

## Quy trình từng bước

Vào [/firmware](/firmware), chọn firmware của dự án và nhấn **Kết nối & Flash**. Thanh trạng thái sẽ đi qua các bước sau:

| Trạng thái | Chuyện gì đang xảy ra | Bạn cần làm gì |
| --- | --- | --- |
| **Chọn cổng kết nối trong hộp thoại của trình duyệt** | Trình duyệt liệt kê các cổng serial. Bo ESP thường hiện là *USB Serial*, *CP210x*, *CH340* hoặc *USB JTAG/serial debug unit*. | Chọn đúng cổng rồi nhấn Kết nối. Không thấy cổng nào: xem [Driver USB, cáp và chế độ bootloader](/huong-dan/driver-usb-va-che-do-boot). |
| **Đang kết nối với bootloader** | esptool-js kéo chân DTR/RTS để đưa chip vào chế độ download, "bắt tay" ở 115200 baud rồi nạp một *stub* nhỏ vào RAM để ghi nhanh hơn. | Chờ. Quá 10 giây không được: giữ **BOOT**, nhấn **RESET**, thả BOOT, nhấn Thử lại. |
| **Đang nhận diện chip** | Đọc loại chip (ESP32, C3, C6, S3, H2…), địa chỉ MAC, tính năng radio, thạch anh và dung lượng flash. | Kiểm tra thẻ chip hiện ra có đúng bo của bạn không. |
| **Chip không tương thích** | Firmware không có bản dựng cho chip vừa nhận diện. | Chọn firmware khác có hỗ trợ chip này, hoặc dùng bo đúng với dự án. |
| **Đang nhận gói firmware đã mã hoá** | Trang mở một phiên flash có chữ ký với máy chủ, nhận từng phần (bootloader, partition table, app) đã mã hoá và giải mã trong bộ nhớ. | Không cần làm gì. Nhật ký sẽ in "Đã nhận phần 1/3…". |
| **Đang ghi firmware vào chip** | Dữ liệu được nén, ghi vào đúng offset (0x0, 0x8000, 0x10000…) và kiểm tra MD5 từng phần. | **Không rút cáp, không đóng tab.** Thanh tiến trình chạy theo từng phần. |
| **Đang khởi động lại thiết bị** | Kéo RTS để reset cứng; chip chạy firmware mới. | Quan sát LED hoặc đọc mục *Bước tiếp theo*. |
| **Hoàn tất** | Flash thành công, kèm tên firmware, phiên bản và thời gian ghi. | Làm theo các bước sau khi flash của dự án. |

Nếu dừng ở **Có lỗi xảy ra**, thông báo luôn kèm gợi ý cụ thể; tra thêm trong [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash).

## Tuỳ chọn nâng cao

Mở **Tuỳ chọn nâng cao** ngay dưới nút Kết nối & Flash.

### Tốc độ (baud)

| Baud | Khi nào dùng |
| --- | --- |
| 921600 | Nhanh nhất. Hợp với CP2102N/CH343 và cáp ngắn, chất lượng tốt. |
| **460800** (mặc định) | Cân bằng tốc độ và độ ổn định trên CP2102, CH340. |
| 230400 | Khi gặp lỗi giữa chừng hoặc MD5 không khớp; cáp dài, qua hub USB. |
| 115200 | Phương án cuối cho mạch chuyển USB‑UART kém hoặc dây nối tay. |

Bước bắt tay đầu luôn ở 115200; tốc độ bạn chọn chỉ áp dụng sau khi stub đã chạy. Với ESP32‑C3/C6/S3/H2 dùng cổng **USB‑JTAG/serial gốc**, baud gần như không ảnh hưởng vì dữ liệu đi thẳng qua USB.

### Xoá toàn bộ flash trước khi ghi

Bình thường trang chỉ ghi đè những vùng mà firmware chiếm. Vùng **NVS** (lưu Wi‑Fi, Matter fabric, cấu hình) và các phân vùng khác giữ nguyên. Bật "Xoá toàn bộ flash" khi:

- Đổi từ dự án này sang dự án khác, hoặc từ firmware ngoài (Tasmota, ESPHome, Arduino) sang firmware của trang — layout phân vùng khác nhau có thể để lại dữ liệu rác.
- Thiết bị khởi động lại liên tục hoặc hành xử bất thường sau khi flash.
- Muốn **xoá fabric Matter cũ** để ghép lại từ đầu với hệ sinh thái khác (xem [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter)).

Nhược điểm: chậm hơn vài giây đến vài chục giây (tuỳ flash 4–16 MB) và bạn phải cấu hình lại Wi‑Fi hoặc ghép đôi lại.

## Kiểm tra MD5 nghĩa là gì?

Sau khi ghi xong mỗi phần, stub trong RAM đọc lại vùng flash vừa ghi, tính **MD5** và so với MD5 của dữ liệu gốc. Trùng → nhật ký in `Hash of data verified.`; lệch → trang báo **Kiểm tra MD5 không khớp**. MD5 ở đây là công cụ kiểm tra toàn vẹn (dữ liệu có được ghi đúng không), không phải cơ chế bảo mật. Hầu hết lỗi MD5 do đường truyền UART: giảm baud, đổi cáp/cổng USB, bỏ hub, hoặc bật Xoá toàn bộ flash.

## Firmware được bảo vệ như thế nào — và giới hạn thật

Trang cố gắng không để firmware trở thành một file tải về tự do, nhưng cũng không hứa những gì kỹ thuật không làm được:

- **Không có đường dẫn tải về.** File firmware nằm ngoài thư mục công khai. Trình duyệt chỉ nhận được dữ liệu qua một **phiên có chữ ký**, mở khi bạn nhấn Kết nối và hết hạn sau ít phút.
- **Mã hoá theo phiên.** Mỗi phiên có khoá **AES‑256‑GCM** riêng; từng phần firmware được mã hoá kèm thẻ xác thực. Dữ liệu được giải mã trong bộ nhớ trình duyệt ngay trước khi ghi vào chip và xoá khi xong.
- **Chỉ phát bản dựng khớp với chip** đã nhận diện; truy cập thẳng từ thanh địa chỉ hay từ trang khác bị từ chối.
- **Giới hạn trung thực:** để ghi được vào chip, trình duyệt *phải* có dữ liệu đã giải mã trong RAM. Một người có DevTools và đủ kiên nhẫn vẫn có thể lấy được các byte đó. Không có trang web nào làm firmware "100% không thể sao chép", và ai nói ngược lại đang nói quá.

Bảo vệ thật sự nằm **trên chip**: [Flash Encryption](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c6/security/flash-encryption.html) mã hoá nội dung flash bằng khoá trong eFuse để không đọc ngược được, và [Secure Boot](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c6/security/secure-boot-v2.html) chỉ cho phép chạy firmware có chữ ký của bạn. Hai cơ chế này do bạn kích hoạt khi tự build firmware cho sản phẩm; firmware DIY trên trang này không bật sẵn vì chúng khoá vĩnh viễn một số eFuse trên bo của bạn.

## Mẹo nhỏ

- Cắm bo trực tiếp vào máy tính, tránh hub không có nguồn.
- Chỉ mở một tab flash tại một thời điểm; trình duyệt không cho hai tab cùng giữ một cổng.
- Bo có hai cổng USB (ví dụ ESP32‑S3‑DevKitC‑1: *UART* và *USB*) đều flash được; cổng *USB* không cần driver.
- Quá trình dừng giữa chừng? Xem [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash).
