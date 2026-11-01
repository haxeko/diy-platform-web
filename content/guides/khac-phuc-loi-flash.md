---
title: "Khắc phục lỗi khi flash"
summary: "Bảng tra nhanh triệu chứng → nguyên nhân → cách sửa cho lỗi kết nối, MD5, chip không tương thích, thiết bị reset liên tục hay không ghép đôi được, cùng cách đọc Nhật ký kỹ thuật."
category: "khac-phuc"
order: 40
projects: []
updatedAt: "2026-10-31"
---

## Cách dùng trang này

Mỗi lỗi trong trình flash đều kèm một gợi ý ngắn; bài này đi sâu hơn. Tìm **triệu chứng** gần nhất với màn hình của bạn, thử các cách sửa theo thứ tự, và mở **Nhật ký kỹ thuật** khi cần chi tiết (phần cuối bài giải thích các dòng thường gặp).

## Bảng tra lỗi

### Không kết nối được

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
| --- | --- | --- |
| Hộp thoại chọn cổng **trống** | Cáp chỉ sạc; thiếu driver CP210x/CH340; Linux chưa có quyền `dialout`; brltty chiếm cổng (Ubuntu) | Đổi cáp đã biết truyền dữ liệu. Cài driver theo [hướng dẫn driver](/huong-dan/driver-usb-va-che-do-boot). Linux: `sudo usermod -aG dialout $USER` rồi đăng nhập lại; `sudo apt remove brltty`. |
| Có cổng nhưng báo **Không kết nối được với bootloader** / timeout | Bo không tự vào download mode (không có auto‑reset, hoặc ứng dụng đang chiếm UART); chọn nhầm cổng (bo có 2 cổng USB); bridge không cấp đủ dòng | Giữ **BOOT**, nhấn **RESET**, thả BOOT, nhấn *Thử lại*. Thử cổng USB khác trên bo. Rút các module đang nối chân TX/RX/IO0. |
| **Cổng đang được ứng dụng khác sử dụng** | Arduino IDE Serial Monitor, PlatformIO, ESPHome dashboard, `screen`/`minicom`, hoặc một tab trình duyệt khác đang giữ cổng | Đóng ứng dụng/tab đó rồi nhấn *Thử lại*. Trình duyệt chỉ cho một tab giữ một cổng. |
| Kết nối được vài giây rồi rớt | Hub USB không nguồn; cáp lỏng; nguồn bo yếu | Cắm thẳng vào máy tính, đổi cáp, bỏ hub. |

### Chip và firmware

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| **Chip không tương thích** / *Firmware không hỗ trợ chip này* | Firmware chỉ có bản dựng cho một số `chipFamily` (ví dụ ESP32‑C6 và ESP32‑H2), còn bo của bạn là ESP32‑C3 | Xem dòng *Firmware hỗ trợ* trên thẻ chip, chọn firmware khác tại [/firmware](/firmware) có bản cho chip của bạn, hoặc dùng đúng bo của dự án. Bootloader và partition table khác nhau giữa các chip nên không thể "ép". |
| **Không nhận diện được chip** | Bo không phải ESP; đang ở chế độ chạy ứng dụng; nhiễu đường UART | Vào bootloader thủ công; kiểm tra bo thực sự là ESP32 (một số bo "ESP" thực chất là RP2040/STM32 kèm module ESP riêng). |
| **Phiên flash đã hết hạn** | Để quá lâu giữa lúc kết nối và lúc ghi (phiên chỉ có hiệu lực vài phút) | Nhấn *Kết nối* lại để mở phiên mới. |
| **Không nhận được gói firmware** | Mạng chập chờn; proxy/VPN chặn | Kiểm tra mạng, tắt VPN, tải lại trang. |

### Lỗi khi ghi

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| **Kiểm tra MD5 không khớp** | Dữ liệu sai lệch trên đường UART ở baud cao; bridge CH340 nhái; cáp dài | Mở *Tuỳ chọn nâng cao*, giảm baud xuống **230400** (hoặc 115200), bật **Xoá toàn bộ flash**, đổi cáp/cổng USB, bỏ hub. |
| **Ghi flash thất bại** giữa chừng, tiến trình đứng ở x% | Mất kết nối, nguồn sụt khi ghi; máy tính ngủ | Giữ chắc cáp, cắm trực tiếp, giảm baud. Thiết bị đang "dở dang" — flash lại trước khi dùng. |
| Báo **Hoàn tất** nhưng thiết bị không phản ứng | Chưa reset (bo USB‑JTAG gốc đôi khi không tự reset); nhầm cổng USB chỉ cấp nguồn | Nhấn RESET một lần. Mở nhật ký xem có `Hard resetting via RTS pin...` không. |

### Thiết bị sau khi flash

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| **Khởi động lại liên tục** (LED nhấp nháy theo chu kỳ, serial in log boot lặp) | Flash còn dữ liệu cũ khác layout; **brown‑out** do nguồn USB yếu (log `Brownout detector was triggered`); bo có flash nhỏ hơn firmware yêu cầu hoặc sai flash mode | Flash lại với **Xoá toàn bộ flash**. Dùng cổng USB/cáp khác, cấp nguồn 5 V ≥ 1 A, hàn thêm tụ **100 µF** (hoặc lớn hơn) giữa 3V3 và GND gần module. So *Dung lượng flash* trên thẻ chip với yêu cầu dự án. |
| Serial in `invalid header: 0xffffffff` | Không có ứng dụng ở offset mong đợi — flash bị xoá nhưng chưa ghi, hoặc ghi sai | Flash lại. |
| Serial in `flash read err, 1000` (ESP32 classic) | GPIO12 bị kéo lên lúc boot → chọn nhầm điện áp flash 1.8 V | Bỏ pull‑up/thiết bị trên GPIO12 (xem [hướng dẫn driver](/huong-dan/driver-usb-va-che-do-boot)). |
| **Không thấy thiết bị khi ghép đôi Matter** | Thiết bị còn **fabric** cũ nên không quảng bá BLE; Border Router Thread chưa có hoặc khác mạng; điện thoại tắt Bluetooth | Flash lại với *Xoá toàn bộ flash* hoặc factory reset theo hướng dẫn dự án. Kiểm tra Border Router theo [Thread và Border Router](/huong-dan/thread-border-router), rồi làm theo [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter). |

## Theo hệ điều hành

### macOS: "cổng đang được sử dụng"

macOS chỉ cho một tiến trình mở một cổng. Thủ phạm quen thuộc: Arduino IDE (Serial Monitor vẫn chạy khi đóng cửa sổ), VS Code với PlatformIO/ESPHome, CoolTerm, `screen` trong Terminal còn treo. Kiểm tra:

```bash
lsof | grep cu.usb
```

Thoát tiến trình được liệt kê (hoặc `kill <PID>`), rồi nhấn *Thử lại*. Nếu bạn từng cài driver CH340 bản kext cũ, gỡ nó để không tranh với driver tích hợp của macOS.

### Windows: COM port

- Mở **Device Manager → Ports (COM & LPT)**. Mỗi cổng USB vật lý có thể sinh ra số COM khác nhau; chọn theo tên (*CP210x*, *CH340*, *USB JTAG/serial debug unit*), không theo số.
- Thiết bị có dấu chấm than → cài driver.
- Windows thỉnh thoảng giữ "bóng ma" của cổng cũ; rút cắm lại hoặc *Scan for hardware changes*.

### Linux

Sau khi cắm, `dmesg | tail` phải thấy `cp210x`, `ch341-uart` hoặc `cdc_acm` gán `ttyUSB0`/`ttyACM0`, và bạn phải thuộc nhóm `dialout`. ModemManager đôi khi giữ cổng mới vài giây — chờ rồi thử lại. Chi tiết trong [hướng dẫn driver](/huong-dan/driver-usb-va-che-do-boot).

## Đọc Nhật ký kỹ thuật

Nhật ký là đầu ra của esptool-js cộng vài dòng của trang. Những dòng đáng chú ý:

| Dòng | Ý nghĩa |
| --- | --- |
| `Connecting...` rồi `Chip is ESP32-C6 (QFN40) (revision v0.1)` | Đã vào bootloader và đọc được loại chip, dạng đóng gói, bản silicon. Đây là chip máy chủ dùng để chọn bản dựng. |
| `Features: WiFi 6, BT 5, IEEE802.15.4` | Radio của chip. `IEEE802.15.4` là điều kiện để chạy Thread/Zigbee. |
| `Uploading stub...` → `Running stub...` → `Stub running...` | Nạp chương trình phụ vào RAM để ghi nhanh và tính MD5. Kẹt ở đây: nguồn hoặc đường UART có vấn đề. |
| `Changing baudrate to 460800` · `Changed.` | Chuyển sang tốc độ bạn chọn sau bắt tay. Lỗi ngay sau dòng này → bridge không chịu baud đó, hãy giảm. |
| `Đã nhận phần 1/3 (… KB) → 0x0` | Trang đã giải mã một phần firmware và biết offset ghi. |
| `Writing at 0x00010000... (12%)` | Tiến trình ghi tại địa chỉ hiện tại. |
| `Wrote 1234567 bytes (654321 compressed) at 0x00010000 in 12.3 seconds` | Phần đó ghi xong. |
| `Hash of data verified.` | **MD5 khớp** — phần vừa ghi đúng từng byte. |
| `Leaving...` · `Hard resetting via RTS pin...` | Kết thúc, reset cứng để chạy firmware mới. |
| `A fatal error occurred: Timed out waiting for packet header` | Mất đồng bộ với chip — thường do baud quá cao hoặc nguồn yếu. |
| `Brownout detector was triggered` (sau reset) | Điện áp sụt dưới ngưỡng; thêm tụ, đổi nguồn. |

Khi cần hỏi trợ giúp, hãy chọn và sao chép toàn bộ nhật ký cùng tên bo mạch, hệ điều hành, trình duyệt và cáp/bridge bạn dùng — thông tin đó giúp cộng đồng trả lời nhanh hơn rất nhiều. Bạn cũng có thể quay lại [trình flash](/firmware) để thử lại từ đầu với baud thấp hơn, hoặc liên hệ qua [trang ủng hộ](/ung-ho).
