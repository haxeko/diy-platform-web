import type { Metadata } from "next";
import { BuyMeACoffeeCard, CryptoCard, MomoCard } from "@/components/support/DonateCards";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { IconBook, IconChip, IconHeart, IconLayers } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSiteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Ủng hộ",
  description: "Ủng hộ dự án qua MoMo, Buy Me a Coffee hoặc ví blockchain để duy trì máy chủ và phát hành firmware miễn phí.",
};

const USES = [
  { icon: IconLayers, title: "Máy chủ & tên miền", body: "Duy trì trang web, API phát firmware và băng thông." },
  { icon: IconChip, title: "Linh kiện thử nghiệm", body: "Bo mạch ESP32-C6/H2/S3, cảm biến, relay, module nguồn cho dự án mới." },
  { icon: IconBook, title: "Thời gian viết hướng dẫn", body: "Kiểm thử trên nhiều hệ sinh thái và cập nhật khi Matter/Thread thay đổi." },
];

export default async function SupportPage() {
  const site = await getSiteConfig();
  const { donate } = site;
  const hasAny = (donate.momo?.enabled ?? false) || (donate.buyMeACoffee?.enabled ?? false) || donate.crypto.length > 0;

  return (
    <Container className="pb-16">
      <PageHeader
        eyebrow="Ủng hộ"
        title="Một ly cà phê cho dự án tiếp theo."
        description={donate.intro || "Mọi đóng góp đều giúp duy trì máy chủ, mua linh kiện và tiếp tục phát hành firmware miễn phí."}
      />

      {hasAny ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {donate.momo?.enabled && <MomoCard momo={donate.momo} />}
          {donate.buyMeACoffee?.enabled && <BuyMeACoffeeCard bmc={donate.buyMeACoffee} />}
          {donate.crypto.length > 0 && <CryptoCard wallets={donate.crypto} />}
        </div>
      ) : (
        <Card padding="lg">
          <p className="text-label-2">Chưa cấu hình kênh ủng hộ. Thêm thông tin trong <code className="rounded bg-fill px-1 font-mono text-[0.9em]">content/site.json</code>.</p>
        </Card>
      )}

      <section className="mt-14" aria-labelledby="support-uses">
        <h2 id="support-uses" className="title-1 text-label">
          Đóng góp của bạn dùng để làm gì?
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {USES.map(({ icon: Icon, title, body }) => (
            <Card key={title} padding="md">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-tint-soft text-tint-strong">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-[1.05rem] font-semibold text-label">{title}</h3>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-label-2">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {donate.thanks && (
        <p className="mt-12 flex items-center justify-center gap-2 text-center text-label-2">
          <IconHeart size={18} className="text-rose" />
          {donate.thanks}
        </p>
      )}
    </Container>
  );
}
