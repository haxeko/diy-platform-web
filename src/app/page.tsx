import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { GuideCard } from "@/components/guides/GuideCard";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { GroupedList, GroupedRow } from "@/components/ui/GroupedList";
import { IconBolt, IconChip, IconCoffee, IconHeart, IconLock, IconPhone, IconUsb, IconWallet } from "@/components/ui/Icons";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFirmwareManifests, getGuides, getProjects } from "@/lib/content/load";
import { getSiteConfig } from "@/lib/content/site";
import { formatDateVi } from "@/lib/format";

const HOW = [
  { icon: IconUsb, tint: "bg-sky-soft text-sky", title: "Cắm bo mạch", body: "Nối ESP32 với máy tính bằng cáp USB truyền dữ liệu. Hầu hết bo mạch hiện đại không cần driver." },
  { icon: IconChip, tint: "bg-mint-soft text-mint", title: "Chọn firmware, chip tự nhận diện", body: "Chọn firmware của dự án. Trang đọc loại chip (C3, C6, S3…) và tự chọn bản dựng phù hợp." },
  { icon: IconLock, tint: "bg-lavender-soft text-lavender", title: "Flash an toàn", body: "Firmware được mã hoá theo phiên, giải mã trong bộ nhớ và ghi thẳng vào chip kèm kiểm tra MD5." },
];

export default async function HomePage() {
  const [site, projects, firmware, guides] = await Promise.all([getSiteConfig(), getProjects(), getFirmwareManifests(), getGuides()]);
  const featured = projects.slice(0, 6);
  const latestFirmware = firmware.filter((f) => f.status !== "deprecated").slice(0, 4);
  const projectTitle = Object.fromEntries(projects.map((p) => [p.slug, p.title]));
  const starterGuides = guides.slice(0, 3);

  return (
    <>
      <Hero siteName={site.shortName} tagline={site.description} />

      <Container className="space-y-20 pb-10">
        <section aria-labelledby="how">
          <SectionHeader id="how" title="Cách hoạt động" description="Ba bước, không cần cài phần mềm, không có file tải về." />
          <div className="grid gap-4 md:grid-cols-3">
            {HOW.map(({ icon: Icon, tint, title, body }, i) => (
              <Card key={title} padding="md" className="animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
                <span className={`flex size-10 items-center justify-center rounded-[12px] ${tint}`}>
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-[1.05rem] font-semibold text-label">{title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-label-2">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="projects">
          <SectionHeader id="projects" title="Dự án nổi bật" description="Matter over Thread, Matter over Wi‑Fi, cảm biến, công tắc — kèm firmware sẵn sàng nạp." href="/projects" />
          {featured.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          ) : (
            <p className="text-label-2">Dự án đầu tiên đang được hoàn thiện.</p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" aria-labelledby="firmware">
          <div>
            <SectionHeader id="firmware" title="Firmware mới" description="Chọn firmware rồi nhấn Kết nối & Flash, chip được nhận diện tự động." href="/firmware" linkLabel="Mở trình flash" />
            {latestFirmware.length ? (
              <GroupedList>
                {latestFirmware.map((f) => (
                  <GroupedRow
                    key={f.id}
                    label={`${f.name} v${f.version}`}
                    detail={`${projectTitle[f.project] ?? f.project} · ${f.builds.map((b) => b.chipFamily).join(", ")}`}
                    value={formatDateVi(f.releasedAt)}
                    href={`/firmware/${f.id}`}
                    icon={<IconBolt size={16} />}
                  />
                ))}
              </GroupedList>
            ) : (
              <p className="text-label-2">Chưa có firmware nào.</p>
            )}
          </div>
          <div>
            <SectionHeader title="Bắt đầu" description="Đọc trước nếu đây là lần đầu bạn làm với Matter/Thread." href="/guides" />
            <div className="grid gap-3">
              {starterGuides.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
              {starterGuides.length === 0 && <p className="text-label-2">Hướng dẫn đang được biên soạn.</p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="support">
          <Card padding="lg" tint="rose" className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_auto]">
            <div>
              <p className="eyebrow flex items-center gap-1.5"><IconHeart size={14} className="text-rose" /> Ủng hộ</p>
              <h2 id="support" className="title-1 mt-2 text-label">Một ly cà phê giúp dự án tiếp theo ra đời.</h2>
              <p className="mt-2 max-w-xl text-label-2">Firmware và hướng dẫn luôn miễn phí. Đóng góp của bạn dùng cho máy chủ, linh kiện thử nghiệm và thời gian viết bài.</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.9rem] text-label-2">
                <li className="inline-flex items-center gap-1.5"><IconPhone size={16} className="text-rose" />MoMo</li>
                <li className="inline-flex items-center gap-1.5"><IconCoffee size={16} className="text-rose" />Buy Me a Coffee</li>
                <li className="inline-flex items-center gap-1.5"><IconWallet size={16} className="text-rose" />Ví blockchain</li>
              </ul>
            </div>
            <div className="flex lg:justify-end">
              <Button href="/support" size="lg" className="bg-rose hover:bg-[#9a1f45]" icon={<IconHeart size={20} />}>
                Ủng hộ dự án
              </Button>
            </div>
          </Card>
          <p className="sr-only">
            <Link href="/support">Đến trang ủng hộ</Link>
          </p>
        </section>
      </Container>
    </>
  );
}
