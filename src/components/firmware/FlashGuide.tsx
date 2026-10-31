import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { IconChip, IconLock, IconUsb, IconWarning } from "@/components/ui/Icons";
import { StepList } from "@/components/ui/StepList";

/**
 * Usage instructions rendered BELOW the flasher. Server component, no state.
 */
export function FlashGuide({ afterFlash, projectHref }: { afterFlash?: string[]; projectHref?: string }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="title-1 text-label">Hướng dẫn sử dụng</h2>
        <p className="mt-1.5 text-label-2">Ba bước để nạp firmware, không cần cài phần mềm hay driver đặc biệt với hầu hết bo mạch hiện đại.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="md" className="animate-rise">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-sky-soft text-sky">
            <IconUsb size={22} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-semibold text-label">1. Kết nối</h3>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-label-2">
            Cắm bo mạch vào máy tính bằng cáp USB truyền dữ liệu. Bo có cổng USB‑C/micro tích hợp thường dùng chip CP2102, CH340 hoặc cổng USB‑JTAG gốc của ESP32‑C3/C6/S3.
          </p>
        </Card>
        <Card padding="md" className="animate-rise [animation-delay:80ms]">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-mint-soft text-mint">
            <IconChip size={22} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-semibold text-label">2. Chọn firmware</h3>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-label-2">
            Chọn bản firmware của dự án. Khi kết nối, trang sẽ đọc loại chip (ESP32, C3, C6, S3…) và tự chọn bản dựng phù hợp. Nếu không tương thích bạn sẽ được báo ngay.
          </p>
        </Card>
        <Card padding="md" className="animate-rise [animation-delay:160ms]">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-lavender-soft text-lavender">
            <IconLock size={22} />
          </span>
          <h3 className="mt-4 text-[1.05rem] font-semibold text-label">3. Flash</h3>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-label-2">
            Nhấn <strong className="font-semibold text-label">Kết nối &amp; Flash</strong>, chọn cổng trong hộp thoại và chờ. Firmware được mã hoá theo phiên, giải mã trong bộ nhớ và ghi thẳng vào chip kèm kiểm tra MD5.
          </p>
        </Card>
      </div>

      {afterFlash && afterFlash.length > 0 && (
        <Card padding="lg">
          <h3 className="title-2 text-label">Sau khi flash xong</h3>
          <p className="mt-1 text-label-2">Làm theo các bước sau để đưa thiết bị vào hệ thống nhà thông minh của bạn.</p>
          <StepList className="mt-5" steps={afterFlash.map((s) => ({ title: s }))} />
          {projectHref && (
            <p className="mt-5 text-[0.95rem] text-label-2">
              Xem sơ đồ nối dây, danh sách linh kiện và giải thích chi tiết trong{" "}
              <Link href={projectHref} className="font-semibold text-tint underline-offset-4 hover:underline">
                trang dự án
              </Link>
              .
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <h3 className="title-2 text-label">Không kết nối được?</h3>
          <ul className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-label-2">
            <li className="flex gap-3">
              <IconWarning size={18} className="mt-1 shrink-0 text-warning" />
              <span>
                <strong className="font-semibold text-label">Vào chế độ bootloader thủ công:</strong> giữ nút <kbd>BOOT</kbd> (IO0), nhấn <kbd>RESET</kbd> (EN), thả <kbd>BOOT</kbd>, rồi nhấn Kết nối lại.
              </span>
            </li>
            <li className="flex gap-3">
              <IconWarning size={18} className="mt-1 shrink-0 text-warning" />
              <span>
                <strong className="font-semibold text-label">Không thấy cổng trong hộp thoại:</strong> đổi cáp USB (nhiều cáp chỉ sạc), cài driver{" "}
                <a href="https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers" target="_blank" rel="noopener noreferrer" className="text-tint hover:underline">CP210x</a>{" "}
                hoặc{" "}
                <a href="https://www.wch-ic.com/downloads/CH341SER_ZIP.html" target="_blank" rel="noopener noreferrer" className="text-tint hover:underline">CH340</a>.
                Trên Linux, thêm người dùng vào nhóm <code className="rounded bg-fill px-1 font-mono text-[0.85em]">dialout</code>.
              </span>
            </li>
            <li className="flex gap-3">
              <IconWarning size={18} className="mt-1 shrink-0 text-warning" />
              <span>
                <strong className="font-semibold text-label">Cổng đang bận:</strong> đóng Arduino IDE, PlatformIO, ESPHome dashboard hoặc tab trình duyệt khác đang mở Serial Monitor.
              </span>
            </li>
            <li className="flex gap-3">
              <IconWarning size={18} className="mt-1 shrink-0 text-warning" />
              <span>
                <strong className="font-semibold text-label">Lỗi giữa chừng hoặc MD5 không khớp:</strong> mở Tuỳ chọn nâng cao, giảm baud xuống 230400 và bật “Xoá toàn bộ flash”.
              </span>
            </li>
          </ul>
          <p className="mt-5 text-[0.95rem]">
            <Link href="/guides/khac-phuc-loi-flash" className="font-semibold text-tint underline-offset-4 hover:underline">
              Xem hướng dẫn khắc phục đầy đủ →
            </Link>
          </p>
        </Card>

        <Card padding="lg">
          <h3 className="title-2 text-label">Trình duyệt &amp; hệ điều hành</h3>
          <div className="mt-4 overflow-hidden rounded-[14px] border border-separator">
            <table className="w-full text-[0.9rem]">
              <thead className="bg-surface-2 text-left text-label-2">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Trình duyệt</th>
                  <th className="px-3.5 py-2.5 font-semibold">Hỗ trợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator text-label">
                <tr><td className="px-3.5 py-2.5">Chrome, Edge, Opera, Arc, Brave (máy tính)</td><td className="px-3.5 py-2.5 text-success font-semibold">Có</td></tr>
                <tr><td className="px-3.5 py-2.5">Chrome trên Android</td><td className="px-3.5 py-2.5 text-label-3">Chưa (Web Serial chưa có trên di động)</td></tr>
                <tr><td className="px-3.5 py-2.5">Safari (macOS/iOS), Firefox</td><td className="px-3.5 py-2.5 text-label-3">Chưa hỗ trợ</td></tr>
              </tbody>
            </table>
          </div>
          <Callout tone="info" className="mt-4" role="note">
            Trang cần chạy qua HTTPS (hoặc localhost) để trình duyệt cho phép truy cập cổng USB. Nếu nút Kết nối bị mờ, hãy kiểm tra địa chỉ trang.
          </Callout>
        </Card>
      </div>

      <Card padding="lg" tint="graphite">
        <h3 className="title-2 text-label">Firmware được bảo vệ như thế nào?</h3>
        <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-label-2">
          <li>• Không có đường dẫn tải về: file nằm ngoài thư mục công khai và chỉ được phát qua phiên có chữ ký, hết hạn sau vài phút.</li>
          <li>• Mỗi phiên dùng khoá AES‑256‑GCM riêng; dữ liệu được giải mã trong bộ nhớ trình duyệt ngay trước khi ghi và xoá sau khi xong.</li>
          <li>• Máy chủ chỉ phát bản dựng khớp với chip đã nhận diện và từ chối mọi truy cập trực tiếp từ thanh địa chỉ hay trang khác.</li>
          <li>• Giới hạn trung thực: trình duyệt phải nhận dữ liệu để nạp nên không thể bảo vệ tuyệt đối. Với dự án cần bảo mật cao, hãy bật Flash Encryption và Secure Boot trên chip.</li>
        </ul>
      </Card>
    </div>
  );
}
