---
title: "Driver USB, cáp và chế độ bootloader"
summary: "Phân biệt CP210x, CH340/CH343 và USB‑JTAG gốc của ESP32‑C3/C6/S3/H2, cài driver trên Windows/macOS/Linux, chọn đúng cáp, vào bootloader thủ công và nối mạch USB‑UART rời."
category: "phan-cung"
order: 30
projects: []
updatedAt: "2026-10-31"
---

## Bo của bạn nối USB bằng cách nào?

Chip ESP32 giao tiếp với máy tính qua UART. Trên bo phát triển có ba cách phổ biến để đưa UART ra cổng USB — và cách nào quyết định bạn có cần driver hay không.

| Cách nối | Chip cầu nối | Tên cổng trên máy | Driver |
| --- | --- | --- | --- |
| USB‑UART bridge của Silicon Labs | CP2102, CP2102N, CP2104 | Windows: *Silicon Labs CP210x USB to UART Bridge (COMx)* · macOS: `/dev/cu.usbserial-xxxx` (hoặc `/dev/cu.SLAB_USBtoUART` với driver hãng) · Linux: `/dev/ttyUSB0` | Windows 10/11 và macOS mới thường nhận sẵn; nếu không, cài [CP210x VCP](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers) |
| USB‑UART bridge của WCH | CH340, CH341, CH343, CH9102 | Windows: *USB‑SERIAL CH340 (COMx)* · macOS: `/dev/cu.usbserial-xxxx` / `/dev/cu.wchusbserialxxxx` · Linux: `/dev/ttyUSB0` (CH343 có thể là `/dev/ttyACM0`) | Windows thường cần [CH341SER](https://www.wch-ic.com/downloads/CH341SER_ZIP.html); macOS 11+ và Linux có sẵn |
| **USB‑JTAG/serial gốc** của chip | Tích hợp trong ESP32‑C3, C6, S3, H2 (và C5, P4) | Windows: *USB JTAG/serial debug unit (COMx)* · macOS: `/dev/cu.usbmodemxxxx` · Linux: `/dev/ttyACM0` | **Không cần driver** |

Nhiều dev kit chính hãng (ESP32‑S3‑DevKitC‑1, ESP32‑C6‑DevKitC‑1) có **hai cổng USB‑C**: một ghi *UART* (qua CP2102N) và một ghi *USB* (gốc). Cả hai đều flash được; cổng *USB* tiện hơn vì không cần driver và không phụ thuộc baud.

> Bo giá rẻ đôi khi gắn CH340 "nhái" hoặc CP2102 bản cũ không chạy ổn ở 921600 baud. Nếu flash lỗi giữa chừng, giảm baud xuống 460800 hoặc 230400 trong Tuỳ chọn nâng cao.

## Cài driver theo hệ điều hành

### Windows

1. Cắm bo, mở **Device Manager → Ports (COM & LPT)**. Thấy *CP210x*, *CH340* hoặc *USB JTAG/serial debug unit* kèm số COM là xong.
2. Nếu hiện *Unknown device* hoặc có dấu chấm than vàng, cài driver tương ứng ở bảng trên rồi rút cắm lại.
3. Số COM có thể đổi khi cắm vào cổng USB khác; trong hộp thoại của trình duyệt chỉ cần chọn đúng tên.

### macOS

- macOS Big Sur trở lên có driver cho CP210x và CH34x tích hợp; thường không cần cài gì.
- Nếu từng cài driver bên thứ ba cũ (đặc biệt bản kext CH340 trước 2020), hãy gỡ — hai driver tranh nhau sẽ làm cổng biến mất hoặc báo "đang được sử dụng".
- Kiểm tra nhanh trong Terminal: `ls /dev/cu.*`.

### Linux

Kernel Linux có sẵn driver `cp210x`, `ch341` và `cdc_acm` (cho USB‑JTAG gốc). Hai việc thường phải làm:

```bash
# Cho phép người dùng mở cổng serial (Debian/Ubuntu; Arch/Fedora có thể là nhóm uucp)
sudo usermod -aG dialout $USER
# Đăng xuất và đăng nhập lại để nhóm có hiệu lực
```

Trên Ubuntu 22.04 trở lên, gói **brltty** (hỗ trợ màn hình chữ nổi) nhận nhầm CH340 là thiết bị của nó và chiếm cổng ngay khi cắm; `dmesg` sẽ thấy `ttyUSB0` xuất hiện rồi biến mất. Cách xử lý đơn giản nhất:

```bash
sudo apt remove brltty
```

Kiểm tra: `ls /dev/ttyUSB* /dev/ttyACM*` và `dmesg | tail` sau khi cắm bo. CH343 rất mới có thể cần kernel 6.x hoặc driver `ch343` từ WCH.

### ChromeOS

Chrome trên ChromeOS hỗ trợ Web Serial và có driver sẵn cho hầu hết bridge; không cần cài thêm.

## Cáp: truyền dữ liệu hay chỉ sạc?

Cáp "chỉ sạc" chỉ có hai dây nguồn — bo sáng LED nhưng máy tính không thấy cổng nào. Dấu hiệu nhận biết: cáp đi kèm pin dự phòng, quạt mini, đèn; cáp rất mỏng; cáp USB‑C → USB‑C giá rẻ không ghi chuẩn. Giữ riêng một cáp đã biết chắc truyền được dữ liệu (ví dụ cáp đi kèm điện thoại) để debug.

Với USB‑C → USB‑C, một số bo thiếu điện trở 5.1 kΩ trên chân CC nên laptop/Mac không cấp nguồn; đổi sang cáp USB‑A → USB‑C sẽ chạy.

## Chế độ bootloader (download mode)

Khi reset, chip đọc các **chân strapping** để quyết định chạy ứng dụng trong flash hay vào bootloader chờ nạp. Trên dev kit, mạch tự động (auto‑reset) dùng tín hiệu DTR/RTS của bridge để kéo các chân này, nên bình thường bạn không cần bấm gì.

### Vào bootloader thủ công

Khi trang báo **Không kết nối được với bootloader**, hoặc bo không có mạch auto‑reset:

1. **Giữ** nút **BOOT** (còn ghi IO0, hoặc IO9 trên C3/C6/H2).
2. **Nhấn rồi thả** nút **RESET** (còn ghi EN, RST).
3. **Thả** BOOT.
4. Nhấn **Kết nối & Flash** hoặc *Thử lại* trong vòng vài giây.

Cách khác: giữ BOOT trong khi cắm cáp USB. Chip ở chế độ này in `waiting for download` trên serial và không chạy ứng dụng cho đến khi reset lại. Sau khi flash xong trang sẽ tự reset; với bo dùng cổng USB‑JTAG gốc mà không tự chạy, nhấn RESET một lần.

| Chip | Chân BOOT (strapping) |
| --- | --- |
| ESP32, ESP32‑S2, ESP32‑S3 | GPIO0 |
| ESP32‑C3, ESP32‑C6, ESP32‑H2, ESP32‑C2 | GPIO9 |

### Bo không có auto‑reset hoặc không có USB

Module trần (ESP32‑WROOM, ESP32‑C6‑MINI…), bo tiết kiệm pin hay bo tự thiết kế thường không có bridge. Dùng một mạch chuyển USB‑UART rời (CP2102, CH340, FT232) chạy **3.3 V** và nối như sau:

| USB‑UART | ESP32 | Ghi chú |
| --- | --- | --- |
| TX | RX (U0RXD) | Chéo nhau |
| RX | TX (U0TXD) | Chéo nhau |
| GND | GND | Bắt buộc, nối trước |
| 3V3 | 3V3 | Nhiều bridge chỉ cấp được ~100–200 mA; nếu bo reset khi phát Wi‑Fi, cấp nguồn 3.3 V riêng hoặc đưa 5 V vào chân 5V/VIN của bo có LDO |
| — | IO0 (hoặc IO9) → GND | Nối với GND lúc cấp nguồn/reset để vào bootloader; tháo ra sau khi flash |
| — | EN | Nút nhấn về GND để reset; bo thường đã có pull‑up |
| DTR, RTS (tuỳ chọn) | IO0, EN | Nếu muốn auto‑reset, nối qua hai transistor như sơ đồ dev kit của Espressif |

> Chân GPIO của ESP32 là **3.3 V**. Một số mạch chuyển có jumper 5 V chỉ đổi điện áp cấp nguồn, còn mức logic vẫn 5 V — kiểm tra datasheet trước khi nối thẳng vào RX của ESP32.

## Lưu ý chân strapping trên ESP32 classic

ESP32 đời đầu có nhiều chân được đọc lúc khởi động hơn các dòng mới, và dễ gây lỗi khó hiểu nếu mạch của bạn kéo chúng lên/xuống:

- **GPIO12 (MTDI):** nếu ở mức cao lúc reset, chip chọn điện áp flash **1.8 V**; module WROOM dùng flash 3.3 V sẽ không boot, log in `flash read err, 1000`. Không treo cảm biến/pull‑up lên GPIO12, hoặc đốt eFuse `VDD_SDIO` để bỏ qua chân này.
- **GPIO0:** thấp = bootloader. Nếu bạn gắn nút hay LED kéo xuống, bo sẽ "kẹt" ở chế độ download.
- **GPIO2:** phải thấp hoặc để trôi khi vào download mode; nhiều bo nối LED ở đây nên vẫn ổn, nhưng không kéo lên.
- **GPIO15 (MTDO):** thấp lúc boot sẽ tắt log của bootloader — tiện nếu bạn muốn serial im lặng, phiền nếu đang debug.
- **GPIO6–11** nối với flash SPI nội; đừng dùng.

Các dòng RISC‑V mới (C3, C6, H2) chỉ còn vài chân strapping và không có "bẫy" điện áp flash như GPIO12, nên bớt rắc rối hơn hẳn.

## Kiểm tra nhanh trước khi flash

- [ ] Máy tính thấy cổng (Device Manager / `ls /dev/cu.*` / `ls /dev/tty*`).
- [ ] Không có ứng dụng khác (Arduino IDE, PlatformIO, ESPHome dashboard, screen/minicom) đang mở cổng.
- [ ] Cáp đã dùng để truyền dữ liệu thành công trước đó.
- [ ] Nếu dùng bridge rời: GND nối chung, TX/RX chéo, IO0 về GND khi reset.

Vẫn vướng? Xem [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash) hoặc quay lại [trình flash](/firmware).
