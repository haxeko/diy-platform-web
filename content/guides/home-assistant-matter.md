---
title: "Đưa thiết bị vào Home Assistant (Matter, Thread, ESPHome)"
summary: "Cài Matter Server và tích hợp Matter, ghép đôi từ Companion app, chạy OpenThread Border Router với Connect ZBT‑1, chia sẻ credentials Thread với Apple/Google, viết automation đầu tiên và chọn giữa ESPHome hay Matter."
category: "home-assistant"
order: 70
projects: []
updatedAt: "2026-10-31"
---

## Tổng quan: ba con đường vào Home Assistant

Thiết bị ESP32 có thể vào Home Assistant (HA) theo ba cách:

| Đường | Cần gì | Khi nào chọn |
| --- | --- | --- |
| **Matter over Thread** | Matter Server + tích hợp Matter + Border Router (OTBR add-on hoặc hub Apple/Google) | Thiết bị chạy pin, muốn dùng chung với Apple/Google |
| **Matter over Wi‑Fi** | Matter Server + tích hợp Matter, Wi‑Fi 2.4 GHz | Không có Border Router, thiết bị cắm điện |
| **ESPHome** | Tích hợp ESPHome (native API), Wi‑Fi | Chỉ dùng HA, cần cảm biến/màn hình phong phú và tuỳ biến sâu |

Bài này viết cho **Home Assistant OS** hoặc **Supervised** (có Add-on store). Nếu bạn chạy HA Container/Core, bạn phải tự chạy container `python-matter-server` và `otbr`; các bước còn lại giống nhau.

## Bước 1: Matter Server và tích hợp Matter

1. **Cài đặt → Thiết bị & dịch vụ → Thêm tích hợp → Matter**. Trên HA OS, HA đề nghị cài add-on **Matter Server** tự động; chấp nhận và chờ add-on khởi động (lần đầu có thể mất một hai phút để tải chứng chỉ của CSA).
2. Khi tích hợp báo đã kết nối, HA đã có một **Matter controller** với fabric riêng; khoá fabric nằm trong dữ liệu của add-on và được backup HA chuẩn bao gồm — mất nó là mất quyền điều khiển mọi thiết bị đã ghép.
3. Matter Server cần **IPv6** hoạt động trên LAN (ít nhất là link‑local) và mDNS. Hầu hết router gia đình đều ổn; nếu HA chạy trong máy ảo, đặt card mạng ở chế độ **bridge**, không dùng NAT.

## Bước 2: Ghép đôi từ Companion app

Vì thiết bị Matter mới dùng **BLE** để onboarding, bạn cần điện thoại chạy **Home Assistant Companion** (iOS hoặc Android) nối cùng mạng với HA. Giao diện web trên máy tính không có Bluetooth nên không thể bắt đầu ghép thiết bị mới (trừ trường hợp nhập mã chia sẻ từ hệ khác).

1. Flash firmware tại [/firmware](/firmware), bật *Xoá toàn bộ flash* nếu bo đã dùng cho dự án khác.
2. Trên điện thoại: **Companion app → Cài đặt → Thiết bị & dịch vụ → Thêm tích hợp → Matter → Thêm thiết bị Matter → Thiết bị mới**.
3. Quét **mã QR** của dự án (trang [/projects](/du-an)) hoặc nhập **mã 11 số**.
4. Điện thoại sẽ hỏi quyền Bluetooth và (với Thread) quyền truy cập credentials Thread.
5. Khoảng 30–90 giây sau, thiết bị xuất hiện dưới tích hợp Matter với các entity: `light.…`, `switch.…`, `sensor.…`, `binary_sensor.…`. Đặt tên, gán khu vực.

Thiết bị đã có trong Apple Home hoặc Google Home? Không cần reset: dùng chức năng chia sẻ ở hệ đó để lấy mã mới, rồi trong HA chọn **Thêm thiết bị Matter → Thiết bị đã có trong hệ khác** và nhập mã. Chi tiết trong [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter).

> Home Assistant không chặn Vendor ID thử nghiệm (0xFFF1) nên firmware DIY ghép bình thường, không có cảnh báo "chưa chứng nhận" như Apple Home.

## Bước 3: Thread với OpenThread Border Router

Dự án Matter over Thread cần một Border Router. Nếu nhà bạn chưa có Apple TV/HomePod/Nest Hub, hãy cho HA tự làm Border Router:

1. Cắm **Home Assistant Connect ZBT‑1** (tên cũ SkyConnect) hoặc dongle EFR32 tương thích vào máy chạy HA, qua **cáp nối dài USB** để tránh nhiễu từ cổng USB 3.0 và vỏ máy.
2. Dongle phải chạy firmware **OpenThread RCP** (không phải Zigbee; firmware multiprotocol đã ngừng hỗ trợ). HA nạp được firmware cho ZBT‑1 ngay trong phần cài đặt phần cứng; dongle khác nạp theo hướng dẫn của hãng.
3. **Cài đặt → Add-ons → OpenThread Border Router**: chọn thiết bị `/dev/serial/by-id/usb-Nabu_Casa_...`, baud **460800**, bật **hardware flow control**, khởi động.
4. **Thiết bị & dịch vụ → Thread** sẽ hiện mạng mới do OTBR tạo, đánh dấu *Preferred network*. Tích hợp **Open Thread Border Router** cũng tự được thêm.
5. Giờ ghép đôi như Bước 2: HA sẽ gửi dataset của mạng này cho thiết bị.

Muốn dùng cả **Zigbee** (ZHA/Zigbee2MQTT) và Thread? Dùng **hai dongle**, mỗi dongle một giao thức — đáng tin cậy hơn nhiều so với multiprotocol trước đây.

### Chia sẻ credentials Thread với Apple/Google

Mục tiêu: chỉ **một** mạng Thread trong nhà, để thiết bị ghép từ hệ nào cũng vào chung mesh và dùng được mọi Border Router.

- **Lấy từ Apple/Google về HA:** mở Companion app → **Cài đặt → Companion app → Thread** (vị trí có thể khác chút giữa phiên bản; Android gọi là *Import credentials*, iOS là *Sync credentials*). HA lưu dataset của Apple/Google và bạn có thể đặt nó làm *Preferred network*; OTBR của HA có thể gia nhập mạng đó thay vì tạo mạng riêng (**Thread → Cấu hình → thêm Border Router vào mạng ưu tiên**).
- **Đưa dataset của HA lên điện thoại:** cùng màn hình Thread trong Companion app, chọn gửi dataset của HA lên điện thoại; iOS/Android lưu vào kho credentials để Apple Home/Google Home biết mạng của HA khi commissioning.

Đổi *Preferred network* không di chuyển thiết bị đã ghép; chúng vẫn ở mạng cũ. Hãy quyết định sớm trước khi có nhiều thiết bị. Thêm về vai trò và kênh trong [Thread và Border Router](/huong-dan/thread-border-router).

## Automation đầu tiên

Ví dụ: bật đèn Matter ở phòng khách 15 phút trước hoàng hôn với độ sáng 60 %, tắt lúc 23:00. Tạo qua giao diện (**Cài đặt → Tự động hoá & cảnh**) hoặc dán YAML (menu ba chấm → *Sửa dưới dạng YAML*):

```yaml
alias: "Đèn phòng khách theo hoàng hôn"
description: "Bật đèn Matter trước hoàng hôn, tắt lúc 23:00"
triggers:
  - trigger: sun
    event: sunset
    offset: "-00:15:00"
    id: toi
  - trigger: time
    at: "23:00:00"
    id: khuya
actions:
  - choose:
      - conditions:
          - condition: trigger
            id: toi
        sequence:
          - action: light.turn_on
            target:
              entity_id: light.den_phong_khach
            data:
              brightness_pct: 60
      - conditions:
          - condition: trigger
            id: khuya
        sequence:
          - action: light.turn_off
            target:
              entity_id: light.den_phong_khach
mode: single
```

Thay `light.den_phong_khach` bằng entity ID thực của bạn (xem trong trang thiết bị Matter). HA cần biết vị trí nhà (**Cài đặt → Hệ thống → Chung**) để tính giờ hoàng hôn.

## Dashboard

- Tạo dashboard mới kiểu **Sections**, dùng **Tile card** cho đèn/công tắc (có thanh kéo độ sáng) và **Sensor card** hoặc **History graph** cho nhiệt độ/độ ẩm.
- Đặt tên entity gọn (`light.den_phong_khach`) ngay từ đầu — đổi tên sau sẽ phải sửa automation.

## ESPHome hay Matter?

Cùng một bo ESP32‑C6 có thể chạy ESPHome hoặc Matter; chọn theo mục tiêu:

| | ESPHome | Matter |
| --- | --- | --- |
| Hệ sinh thái | Chỉ Home Assistant (và API/MQTT) | HA + Apple + Google + Alexa + SmartThings |
| Mạng | Wi‑Fi (Ethernet trên vài bo); làm BLE proxy | Thread hoặc Wi‑Fi |
| Loại thiết bị | Gần như vô hạn: mọi cảm biến I²C/SPI, màn hình, LED strip, UART… | Danh mục device type của Matter: đèn, công tắc, ổ cắm, cảm biến cơ bản, rèm, khoá, điều hoà… |
| Tuỳ biến | Cấu hình YAML, cập nhật OTA từ HA, lambda C++ | Ít hơn; logic nằm trong firmware |
| Chạy pin | Deep sleep được nhưng khó, Wi‑Fi tốn | Thread SED tiết kiệm rõ rệt |
| Cần hub | Không | Border Router cho Thread |

Quy tắc gọn: **chỉ dùng HA và muốn mọi thứ tuỳ biến → ESPHome. Cần Apple Home/Google Home điều khiển được, hoặc thiết bị chạy pin → Matter over Thread.** Nhiều người dùng cả hai: ESPHome cho màn hình, LED và cảm biến "lạ", Matter cho đèn/công tắc chia sẻ với cả nhà.

Nếu một dự án phát hành bản ESPHome, bạn flash nó qua [/firmware](/firmware) như mọi firmware khác; sau đó HA tự phát hiện thiết bị qua mDNS và đề nghị thêm vào tích hợp ESPHome.

## Đi tiếp

- Tài liệu chính thức: [Matter trong Home Assistant](https://www.home-assistant.io/integrations/matter/), [Thread](https://www.home-assistant.io/integrations/thread/), [OpenThread Border Router add-on](https://github.com/home-assistant/addons/tree/master/openthread_border_router), [ESPHome](https://esphome.io/).
- Lỗi ghép đôi → [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter); lỗi flash → [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash).
- Thấy hữu ích? Ghé [trang ủng hộ](/ung-ho) — mỗi ly cà phê giúp mình duy trì máy chủ và firmware miễn phí.
