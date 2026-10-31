import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container size="sm" className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="title-large mt-3 text-label">Không tìm thấy trang</h1>
      <p className="mt-4 text-label-2">Đường dẫn có thể đã thay đổi hoặc nội dung chưa được phát hành.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/">Về trang chủ</Button>
        <Button href="/firmware" variant="tinted">
          Đến trang Firmware
        </Button>
      </div>
    </Container>
  );
}
