---
title: "Ghép đôi thiết bị Matter với Apple Home, Google Home, Alexa và Home Assistant"
summary: "Commissioning hoạt động thế nào, mã QR và mã 11 số nằm ở đâu, các bước ghép đôi cho từng hệ sinh thái, chia sẻ thiết bị sang hệ thứ hai, fabric là gì và xử lý lỗi ghép đôi thường gặp."
category: "matter"
order: 50
projects: []
updatedAt: "2026-10-31"
---

## Commissioning diễn ra như thế nào?

Ghép đôi (commissioning) một thiết bị Matter gồm bốn chặng, thường mất một đến hai phút:

1. **Quảng bá qua BLE.** Thiết bị mới (hoặc vừa factory reset) phát tín hiệu Bluetooth Low Energy kèm *discriminator* — một số 12 bit nằm trong mã QR để điện thoại tìm đúng thiết bị.
2. **Xác thực bằng passcode.** Điện thoại dùng mã trong QR/mã 11 số để mở kênh bảo mật tạm thời (PASE); hãy giữ mã này kín như mật khẩu Wi‑Fi.
3. **Cấp thông tin mạng.** Hệ sinh thái gửi cho thiết bị thông tin **Thread** (operational dataset) hoặc **Wi‑Fi** (SSID/mật khẩu). Thiết bị tắt BLE, tham gia mạng và nhận địa chỉ IPv6.
4. **Gia nhập fabric.** Controller cấp chứng thư (Node Operational Certificate) để thiết bị thuộc về fabric của hệ sinh thái đó. Từ đây mọi lệnh điều khiển đi qua mạng nội bộ, không cần BLE nữa.

## Mã QR và mã 11 số nằm ở đâu?

Mỗi firmware Matter trên trang dùng một *onboarding payload* cố định: mã QR dạng `MT:…` và **mã ghép đôi thủ công 11 số** (ví dụ `3497-011-2332`). Bạn tìm thấy chúng ở:

- **Trang dự án** tại [/projects](/du-an), mục ghép đôi;
- Phần **Bước tiếp theo** hiện ra ngay sau khi flash thành công tại [/firmware](/firmware);
- Log serial của thiết bị khi khởi động (firmware in cả URL tạo mã QR).

Hai mã trỏ về cùng discriminator và passcode; dùng mã 11 số khi quét QR không được.

> Vì firmware DIY dùng chung một payload cho mọi bo, hai thiết bị cùng dự án sẽ có cùng mã. Hãy ghép từng thiết bị một: xong thiết bị thứ nhất rồi mới cấp điện thiết bị thứ hai để điện thoại không nhầm.

## Trước khi bắt đầu

- Điện thoại **bật Bluetooth**, nối Wi‑Fi cùng mạng với hub/Border Router.
- Dự án Thread: có Border Router cùng hệ sinh thái ([Thread và Border Router](/huong-dan/thread-border-router)). Dự án Wi‑Fi: router phát **2.4 GHz** (ESP32 không bắt 5 GHz, trừ C5).
- Thiết bị **chưa thuộc fabric nào**: vừa flash với *Xoá toàn bộ flash* hoặc vừa factory reset.

## Từng hệ sinh thái

### Apple Home (iOS/iPadOS)

1. Cần một **home hub** (Apple TV 4K hoặc HomePod) trong nhà — Apple yêu cầu với mọi phụ kiện Matter, không chỉ Thread.
2. Mở **Nhà** → **+** → **Thêm phụ kiện** → quét mã QR. Không quét được: chọn **Tuỳ chọn khác…** → **Phụ kiện của tôi không hiện ở đây** → **Nhập mã** và gõ 11 số.
3. Apple sẽ cảnh báo **"Phụ kiện chưa được chứng nhận"** (Uncertified Accessory). Đây là điều bình thường với firmware DIY dùng Vendor ID thử nghiệm; nhấn **Vẫn thêm**.
4. Chọn phòng, đặt tên. Với thiết bị Thread, chi tiết phụ kiện hiện kết nối *Thread*.

### Google Home (Android/iOS)

1. Dự án Thread cần hub Google có Thread (Nest Hub 2nd gen, Nest Hub Max, Nest Wifi Pro); dự án Wi‑Fi chỉ cần điện thoại có app Google Home.
2. **Google Home** → **+** → **Thiết bị** → **Thiết bị mới** → chọn nhà → app tự tìm thiết bị Matter gần đó, hoặc bạn quét QR / chọn **Thiết lập không cần mã QR** để nhập 11 số.
3. Google đối chiếu Vendor ID/Product ID với danh sách chứng nhận. Thiết bị DIY dùng VID thử nghiệm **0xFFF1** có thể bị từ chối trừ khi bạn tạo một dự án Matter trong [Google Home Developer Console](https://developers.home.google.com/) với cùng VID/PID và dùng cùng tài khoản Google. Cách đơn giản hơn: ghép vào Apple Home hoặc Home Assistant trước rồi **chia sẻ** sang Google (xem Multi‑admin bên dưới).

### Amazon Alexa

1. Thiết bị Thread cần **Echo (4th gen)** hoặc Echo đời mới có Border Router. Dự án Wi‑Fi dùng được với hầu hết Echo hiện đại.
2. **Alexa** → **Thiết bị** → **+** → **Thêm thiết bị** → **Matter** → quét QR hoặc nhập mã.
3. Alexa khá chặt với thiết bị chưa chứng nhận. Nếu app dừng ở bước kiểm tra, ghép vào Home Assistant trước rồi chia sẻ sang Alexa.

### Home Assistant

1. Cài add-on **Matter Server** và tích hợp **Matter** (với Thread: thêm add-on OpenThread Border Router) — xem [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter).
2. Mở **Home Assistant Companion** trên điện thoại (bắt buộc, vì cần BLE của điện thoại) → **Cài đặt → Thiết bị & dịch vụ → Thêm tích hợp → Matter → Thêm thiết bị Matter → Thiết bị mới** → quét QR hoặc nhập mã.
3. Với Matter over Thread, HA phải biết dataset mạng Thread: dùng Border Router của chính HA hoặc nhập credentials từ Apple/Google qua Companion app.
4. Thiết bị xuất hiện với các entity (`light.`, `switch.`, `sensor.`…). HA không chặn Vendor ID thử nghiệm.

## Multi‑admin: chia sẻ thiết bị sang hệ sinh thái thứ hai

Một thiết bị Matter có thể thuộc **nhiều fabric** cùng lúc (tối thiểu 5). Không cần factory reset để thêm vào hệ thứ hai; chỉ cần hệ thứ nhất mở "cửa sổ ghép đôi" và cấp mã mới:

| Hệ đang quản lý | Nơi tìm nút chia sẻ |
| --- | --- |
| Apple Home | Cài đặt phụ kiện → **Bật chế độ ghép đôi** → hiện mã thiết lập mới |
| Google Home | Cài đặt thiết bị → **Ứng dụng & dịch vụ Matter liên kết** → **Liên kết ứng dụng & dịch vụ** |
| Alexa | Thiết bị → cài đặt → **Trợ lý và ứng dụng khác** |
| Home Assistant | Trang thiết bị → **Chia sẻ thiết bị** (Share device) → hiện mã QR/11 số |

Mã mới có hiệu lực tối đa **15 phút**; nhập mã đó vào hệ thứ hai như ghép thiết bị mới. Sau đó cả hai hệ điều khiển cùng một thiết bị; trạng thái đồng bộ qua chính thiết bị, không qua cloud.

## "Fabric" là gì và vì sao Xoá toàn bộ flash lại reset nó?

Một **fabric** là "mạng tin cậy" của một controller: Root CA do controller tạo ra cộng với các node đã được nó cấp chứng thư. Mỗi hệ sinh thái tạo fabric riêng; thiết bị lưu danh sách fabric trong phân vùng **NVS** trên flash. Khi còn ít nhất một fabric, thiết bị **không quảng bá BLE** nữa — đó là lý do nó "biến mất" khi bạn muốn ghép lại.

Hai cách xoá fabric:

- **Factory reset bằng nút:** với firmware trên trang này, **giữ nút BOOT 10 giây** khi thiết bị đang chạy; LED nhấp nháy nhanh rồi thiết bị khởi động lại ở trạng thái mới. Firmware giữ nguyên.
- **Xoá toàn bộ flash** rồi flash lại tại [/firmware](/firmware): xoá cả NVS, phù hợp khi đổi dự án hoặc khi factory reset bằng nút không hiệu quả.

Gỡ thiết bị khỏi app cũng xoá fabric trên thiết bị, nhưng chỉ khi nó còn online lúc đó; gỡ khi thiết bị đã tắt thì fabric "mồ côi" vẫn nằm trong NVS và bạn cần factory reset.

## Lỗi ghép đôi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| App "không tìm thấy phụ kiện" | Thiết bị đã thuộc fabric nên không phát BLE; Bluetooth điện thoại tắt; thiết bị quá xa | Factory reset (BOOT 10 s) hoặc flash với *Xoá toàn bộ flash*; bật Bluetooth; đứng cách thiết bị dưới 2 m. |
| Dừng ở bước "Kết nối với mạng Thread" / "Đang thêm vào nhà" | Không có Border Router cùng hệ sinh thái; Border Router offline/chưa cập nhật; hub và điện thoại khác mạng | Kiểm tra hub online, cùng Wi‑Fi; xem [Thread và Border Router](/huong-dan/thread-border-router). |
| Dừng ở bước Wi‑Fi | Router chỉ phát 5 GHz; mật khẩu sai; cách ly client (AP isolation) | Bật 2.4 GHz, tắt isolation, thử hotspot điện thoại để loại trừ. |
| Ghép xong nhưng "Không phản hồi" sau vài phút | Thiết bị Thread rớt mạng (xa router Thread, nguồn yếu); mDNS bị chặn trên router Wi‑Fi | Thêm thiết bị Thread cắm điện làm router trung gian; bật mDNS/multicast; kiểm tra brown‑out. |

## Về Vendor ID thử nghiệm

Firmware DIY trên trang dùng **Vendor ID 0xFFF1 / Product ID 0x8000** — dải CSA dành riêng cho thử nghiệm, không gắn với hãng nào và không được chứng nhận. Apple Home vì thế hiện cảnh báo *Uncertified Accessory* nhưng vẫn cho thêm; Google Home và Alexa có thể kiểm tra chặt hơn; Home Assistant chấp nhận bình thường. Không dùng VID/PID này cho sản phẩm bán ra — cần đăng ký thành viên CSA và chứng nhận.

Thiết bị vẫn không hiện sau khi làm hết các bước trên? Quay lại [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash) để chắc firmware đã ghi đúng, hoặc để lại câu hỏi kèm log tại [trang ủng hộ & liên hệ](/ung-ho).
