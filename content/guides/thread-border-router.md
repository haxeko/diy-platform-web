---
title: "Thread và Border Router: cần gì để thiết bị Thread hoạt động"
summary: "Thread là gì, các vai trò trong mạng mesh, vì sao cần Border Router, bảng lựa chọn từ Apple/Google/Amazon đến Home Assistant và ESP Thread BR, chia sẻ credentials, mẹo tầm phủ và cách kiểm tra thiết bị đã vào mạng."
category: "thread"
order: 60
projects: []
updatedAt: "2026-10-31"
---

## Thread là gì?

**Thread** là giao thức mạng mesh không dây công suất thấp, chạy trên lớp vật lý **IEEE 802.15.4** ở băng 2.4 GHz (cùng radio với Zigbee) và vận chuyển **IPv6** qua 6LoWPAN. Ba đặc điểm làm nó hợp với nhà thông minh:

- **IP gốc.** Mỗi thiết bị Thread có địa chỉ IPv6, nên ứng dụng (Matter, CoAP…) nói chuyện trực tiếp với nó, không cần hub "dịch" như Zigbee.
- **Mesh tự phục hồi.** Thiết bị cắm điện đóng vai trò router, chuyển tiếp gói cho hàng xóm. Một router mất điện, mạng tự tìm đường khác trong vài giây.
- **Tiết kiệm pin.** Cảm biến chạy pin ngủ gần như toàn thời gian; một cell CR2032 có thể dùng nhiều tháng đến vài năm.

Thread do [Thread Group](https://www.threadgroup.org/) quản lý và là một trong hai đường truyền không dây của Matter (bên cạnh Wi‑Fi). Trên ESP32, Thread chạy bằng stack **OpenThread** trong ESP‑IDF trên các chip có radio 802.15.4: **ESP32‑C6**, **ESP32‑H2**, ESP32‑C5.

## Vai trò trong mạng Thread

| Vai trò | Thiết bị điển hình | Nhiệm vụ |
| --- | --- | --- |
| **Leader** | Một router bất kỳ, được bầu tự động | Cấp phát Router ID, giữ bản chính của cấu hình mạng; mất Leader thì mạng bầu lại. |
| **Router** | Thiết bị cắm điện (đèn, ổ cắm, Border Router) | Chuyển tiếp gói tin, làm "cha" cho các End Device. Tối đa 32 router hoạt động trong một partition. |
| **REED** (Router‑Eligible End Device) | Thiết bị cắm điện khi mạng đã đủ router | Hành xử như End Device nhưng có thể thăng cấp thành Router khi cần. |
| **End Device** | Thiết bị luôn bật radio nhưng không chuyển tiếp | Gắn với một Router cha. |
| **Sleepy End Device (SED)** | Cảm biến, nút nhấn chạy pin | Tắt radio phần lớn thời gian, định kỳ thức dậy hỏi cha có tin nhắn không. |
| **Border Router** | Apple TV, HomePod, Nest Hub, HA + dongle, ESP Thread BR | Router có thêm Wi‑Fi/Ethernet; chuyển gói IPv6 giữa mạng Thread và mạng nhà, đăng ký dịch vụ lên mDNS (SRP). |

Thiết bị ESP32‑C6 cắm điện trong firmware của trang thường chạy ở vai trò Router/REED; ESP32‑H2 chạy pin được cấu hình làm SED.

## Vì sao bắt buộc có Border Router?

Mạng Thread là một mạng IPv6 riêng; điện thoại hay máy chạy Home Assistant nằm trên Wi‑Fi/Ethernet và không có radio 802.15.4. **Border Router** là cây cầu: có cả hai radio, định tuyến gói giữa hai bên và đăng ký dịch vụ của thiết bị Thread lên mDNS để controller Matter tìm được. Không có nó, thiết bị Thread vẫn tạo mesh với nhau nhưng không ai điều khiển được.

Border Router cũng giữ **Thread credentials** để đưa thiết bị mới vào mạng. Nhiều Border Router cùng một mạng là bình thường và tăng độ tin cậy.

> Thiết bị Thread không "hỏng" khi Border Router mất điện — chúng vẫn giữ mesh với nhau — nhưng điều khiển từ app sẽ ngừng cho đến khi Border Router trở lại.

## Lựa chọn Border Router

| Hệ sinh thái | Thiết bị | Ghi chú |
| --- | --- | --- |
| Apple Home | **Apple TV 4K** (2nd gen 2021; 3rd gen bản Wi‑Fi + Ethernet), **HomePod mini**, **HomePod (2nd gen)** | Đồng thời là home hub cho Matter. Apple TV 4K 3rd gen bản chỉ Wi‑Fi **không** có Thread. |
| Google Home | **Nest Hub (2nd gen)**, **Nest Hub Max**, **Nest Wifi Pro**, Google TV Streamer (2024) | Nest Hub 1st gen và Nest Mini không có Thread. |
| Amazon Alexa | **Echo (4th gen)**, một số Echo/Echo Hub đời mới | Kiểm tra trang kỹ thuật của từng model; không phải Echo nào cũng có radio 802.15.4. |
| Home Assistant | **Home Assistant Connect ZBT‑1** (tên cũ SkyConnect) hoặc dongle Silicon Labs EFR32 khác (Sonoff ZBDongle‑E…) chạy firmware OpenThread RCP + add-on **OpenThread Border Router** | Một dongle chỉ nên chạy một giao thức; muốn cả Zigbee và Thread hãy dùng hai dongle. Xem [Đưa thiết bị vào Home Assistant](/huong-dan/home-assistant-matter). |
| Tự làm | **ESP Thread Border Router** của Espressif: bo gồm ESP32‑S3 (Wi‑Fi, host) + ESP32‑H2 (RCP 802.15.4) | Firmware mở ([esp-thread-br](https://github.com/espressif/esp-thread-br)), có REST API kiểu OTBR nên khai báo được với Home Assistant. Hợp để học hơn là để dùng hằng ngày. |

Chỉ dùng một hệ sinh thái: mua Border Router của hệ đó. Dùng Home Assistant làm trung tâm: Connect ZBT‑1 + OTBR add-on cho bạn toàn quyền (credentials, kênh, danh sách node).

## Thread credentials: ai giữ và chia sẻ thế nào?

Một mạng Thread được định nghĩa bởi **Operational Dataset**: tên mạng, PAN ID, Extended PAN ID, **kênh**, **Network Key** (khoá 128 bit), mesh‑local prefix và PSKc. Thiết bị nào có dataset đúng là vào được mạng — vì vậy Network Key cần giữ kín.

Khi bạn ghép thiết bị Matter over Thread, controller trên điện thoại lấy dataset từ đâu?

- **Apple:** lưu trong **iCloud Keychain**; app bên thứ ba (Home Assistant Companion, Eve…) có thể xin quyền đọc "preferred network" qua ThreadNetwork framework.
- **Google:** lưu trong Google Play services trên Android; app bên thứ ba dùng Thread Network API để đọc/ghi.
- **Home Assistant:** tích hợp **Thread** lưu dataset của OTBR add-on, nhập được dataset từ Apple/Google qua Companion app và ngược lại gửi dataset của HA lên điện thoại.

Từ Thread 1.3, **nhiều Border Router khác hãng có thể cùng một mạng** nếu có cùng dataset — Apple TV và OTBR của Home Assistant có thể cùng phục vụ một mesh. Tốt nhất chỉ nên có **một** mạng Thread trong nhà: chọn một hệ làm "nguồn" dataset và nhập sang các hệ còn lại.

## Mẹo về tầm phủ và độ ổn định

- **Router nhiều hơn = mesh khoẻ hơn.** Thiết bị chạy pin (SED) không chuyển tiếp gói; chỉ có cảm biến pin và một Border Router thì tầm phủ bằng đúng tầm Border Router. Cắm thêm vài thiết bị Thread có nguồn (đèn, ổ cắm, một bo ESP32‑C6) ở các tầng/phòng xa.
- **Vật cản:** 2.4 GHz xuyên tường gạch kém; bê tông cốt thép và kính tráng kim gần như chặn hẳn. Đặt Border Router ở trung tâm, không giấu trong tủ kim loại.
- **Chung sóng với Wi‑Fi:** Thread dùng kênh **11–26**, chồng lấn Wi‑Fi 2.4 GHz (Wi‑Fi kênh 1 phủ Thread 11–14, kênh 6 phủ 16–19, kênh 11 phủ 21–24); các kênh **15, 20, 25, 26** thường thoáng nhất. Apple/Google tự chọn kênh; trên OTBR của Home Assistant bạn chọn được, nhưng đừng đổi khi mạng đã có nhiều thiết bị.
- **Cách Wi‑Fi router ít nhất 1 m.** Bộ phát Wi‑Fi đặt sát Border Router sẽ "át" tín hiệu 802.15.4 yếu hơn nhiều.
- **Nguồn ổn định** cho bo ESP32: brown‑out khi phát radio làm thiết bị rớt mạng rồi tham gia lại liên tục (xem [Khắc phục lỗi khi flash](/huong-dan/khac-phuc-loi-flash)).

## Thread 1.3 và 1.4

- **Thread 1.3** (2022) chuẩn hoá Border Router: dịch vụ SRP/DNS‑SD để thiết bị tự đăng ký tên, cơ chế nhiều Border Router cùng mạng. Matter over Thread được xây dựng trên nền này.
- **Thread 1.4** (2024) tập trung vào trải nghiệm nhiều hệ sinh thái: chia sẻ credentials và hợp nhất mạng dễ hơn, Border Router có thể cấp kết nối Internet cho thiết bị Thread, chẩn đoán mạng tốt hơn. Các hub lớn đã hoặc đang cập nhật; OpenThread trong ESP‑IDF 5.x cũng theo kịp.

## Kiểm tra thiết bị đã vào mạng chưa

- **Home Assistant:** *Cài đặt → Thiết bị & dịch vụ → Thread → Cấu hình* liệt kê mạng Thread, Border Router và dataset ưu tiên. Trong add-on OTBR, `ot-ctl state` cho biết vai trò, `ot-ctl neighbor table` liệt kê hàng xóm.
- **Apple Home:** mở phụ kiện → cài đặt; thiết bị Thread hiển thị kết nối *Thread*. Ứng dụng **Eve** (miễn phí) vẽ sơ đồ mesh và vai trò từng node — rất tiện để kiểm tra mạng Thread của Apple.
- **Trên chính bo ESP32:** mở serial ở 115200 baud, firmware in vai trò (`router`, `child`…) và địa chỉ IPv6 mesh‑local khi tham gia.

Thiết bị không chịu vào mạng? Rà lại [Ghép đôi thiết bị Matter](/huong-dan/ghep-doi-matter) (thiết bị đã thuộc fabric khác?) và chắc chắn Border Router đang online. Các dự án Thread sẵn có nằm ở [/projects](/du-an).
