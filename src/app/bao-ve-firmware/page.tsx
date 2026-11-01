import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { IconCheck, IconLock, IconShield, IconX } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { StepList } from "@/components/ui/StepList";

export const metadata: Metadata = {
  title: "Firmware được bảo vệ thế nào",
  description: "Cơ chế phát firmware không có file tải về của MachNha: phiên có chữ ký, mã hoá AES-256-GCM theo phiên, giải mã trong bộ nhớ — và giới hạn thật của trình duyệt.",
};

const FLOW = [
  { title: "Kho firmware nằm ngoài thư mục công khai", body: "File .bin (hoặc .bin.enc mã hoá at-rest bằng khoá chủ) không bao giờ được phục vụ như file tĩnh. Không có URL tải về." },
  { title: "Trình duyệt nhận diện chip trước", body: "Chỉ sau khi đọc được loại chip, trang mới xin một phiên nạp. Máy chủ chọn đúng bản dựng cho chip đó; chip không khớp bị từ chối." },
  { title: "Phiên ngắn hạn có chữ ký", body: "Token HMAC‑SHA256 hết hạn sau 10 phút, kèm khoá AES‑256‑GCM riêng cho phiên (dẫn xuất bằng HKDF). Mỗi phần firmware chỉ được phát một lần cho mỗi phiên." },
  { title: "Mã hoá theo phiên, giải mã trong bộ nhớ", body: "Từng phần được mã hoá với IV ngẫu nhiên và gắn với chỉ số phần; trình duyệt giải mã bằng WebCrypto thẳng vào bộ nhớ rồi ghi vào chip kèm kiểm tra MD5." },
  { title: "Xoá sau khi nạp", body: "Bộ đệm được ghi đè bằng 0 ngay khi hoàn tất hoặc gặp lỗi. Không Blob URL, không IndexedDB, không nút tải về." },
];

const PREVENTS = [
  "Tải firmware “tiện tay” bằng cách dán URL vào thanh địa chỉ hoặc dùng curl",
  "Nhúng/hotlink firmware từ trang khác",
  "Thu thập hàng loạt mọi bản dựng bằng script đơn giản",
  "Cache của CDN, proxy hay trình duyệt lưu lại firmware",
  "Nạp nhầm bản dựng cho chip khác loại",
];

const DOES_NOT = [
  "Ngăn người có kỹ năng dùng DevTools để lấy dữ liệu đã giải mã trong bộ nhớ trình duyệt",
  "Ngăn đọc ngược flash bằng esptool read_flash trên chip chưa bật Flash Encryption",
  "Thay thế DRM: khoá phiên nằm trong phản hồi JSON nên đây là “phong bì niêm phong”, không phải két sắt",
];

export default function ProtectionPage() {
  return (
    <Container size="md" className="pb-16">
      <PageHeader
        eyebrow="Bảo vệ firmware"
        title="Không có file tải về — và giới hạn thật của cách này."
        description="MachNha nói thẳng: trình duyệt bắt buộc phải nhận dữ liệu để nạp vào chip, nên không có cách nào bảo vệ tuyệt đối. Dưới đây là những gì chúng tôi làm, những gì nó ngăn được và không ngăn được."
      />

      <Card padding="lg">
        <h2 className="title-2 text-label">Luồng phát firmware</h2>
        <StepList className="mt-5" steps={FLOW} />
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card padding="lg" tint="mint">
          <h2 className="flex items-center gap-2 text-[1.1rem] font-semibold text-label">
            <IconShield size={20} className="text-mint" />
            Ngăn được
          </h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-label-2">
            {PREVENTS.map((t) => (
              <li key={t} className="flex gap-2">
                <IconCheck size={18} className="mt-0.5 shrink-0 text-mint" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card padding="lg" tint="peach">
          <h2 className="flex items-center gap-2 text-[1.1rem] font-semibold text-label">
            <IconX size={20} className="text-peach" />
            Không ngăn được
          </h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-label-2">
            {DOES_NOT.map((t) => (
              <li key={t} className="flex gap-2">
                <IconX size={18} className="mt-0.5 shrink-0 text-peach" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="lg" className="mt-6">
        <h2 className="flex items-center gap-2 title-2 text-label">
          <IconLock size={22} className="text-tint" />
          Bảo vệ thật nằm trên chip
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-label-2">
          Nếu firmware của bạn cần bảo mật thật sự, hãy bật <strong className="font-semibold text-label">Flash Encryption (chế độ Release)</strong> và{" "}
          <strong className="font-semibold text-label">Secure Boot v2</strong> trên ESP32. Khi đó dữ liệu trong flash được mã hoá bằng khoá nằm trong eFuse của chính con chip, không thể đọc ngược, và chip chỉ chạy image đã ký.
        </p>
        <Callout tone="warning" className="mt-4" role="note" title="Cẩn trọng: eFuse không thể hoàn tác">
          Bật Flash Encryption/Secure Boot ở chế độ Release là thao tác một chiều. Thử trên chip nháp trước, giữ khoá ký ở nơi an toàn, và đọc kỹ tài liệu Espressif.
        </Callout>
        <p className="mt-4 text-[0.95rem] text-label-2">
          Tài liệu:{" "}
          <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/flash-encryption.html" target="_blank" rel="noopener noreferrer" className="font-semibold text-tint hover:underline">
            Flash Encryption
          </a>{" "}
          ·{" "}
          <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/secure-boot-v2.html" target="_blank" rel="noopener noreferrer" className="font-semibold text-tint hover:underline">
            Secure Boot v2
          </a>
        </p>
      </Card>

      <Card padding="lg" className="mt-6">
        <h2 className="title-2 text-label">Giấy phép và mã nguồn</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-label-2">
          Firmware xây từ dự án mã nguồn mở (ESP‑Matter, ESPHome, Tasmota…) luôn kèm liên kết mã nguồn/cấu hình trên trang firmware và tuân theo giấy phép gốc. Cơ chế “không tải về” chỉ nhằm đảm bảo mọi lượt nạp đi qua đúng bản đã phát hành — không nhằm che giấu mã nguồn mở.
        </p>
        <p className="mt-3 text-[0.95rem] text-label-2">
          Sẵn sàng thử?{" "}
          <Link href="/firmware" className="font-semibold text-tint underline-offset-4 hover:underline">
            Mở trình nạp firmware →
          </Link>
        </p>
      </Card>
    </Container>
  );
}
