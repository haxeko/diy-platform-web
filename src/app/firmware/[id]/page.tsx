import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flasher } from "@/components/flasher/Flasher";
import { FlashGuide } from "@/components/firmware/FlashGuide";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { GroupedList, GroupedRow } from "@/components/ui/GroupedList";
import { IconChevronRight } from "@/components/ui/Icons";
import { getFirmware, getFirmwareManifests, getProject } from "@/lib/content/load";
import { toFirmwarePublic } from "@/lib/flash/server/public";
import { formatBytes, formatDateVi } from "@/lib/format";

export async function generateStaticParams() {
  const manifests = await getFirmwareManifests();
  return manifests.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fw = await getFirmware(id);
  if (!fw) return { title: "Không tìm thấy firmware" };
  return { title: `${fw.name} v${fw.version}`, description: fw.summary };
}

export default async function FirmwareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manifest = await getFirmware(id);
  if (!manifest) notFound();
  const [firmware, project] = await Promise.all([toFirmwarePublic(manifest), getProject(manifest.project)]);
  const statusTone = manifest.status === "stable" ? "success" : manifest.status === "beta" ? "lavender" : "neutral";
  const statusLabel = manifest.status === "stable" ? "Ổn định" : manifest.status === "beta" ? "Beta" : "Ngừng hỗ trợ";

  return (
    <Container className="pb-16">
      <nav aria-label="Đường dẫn" className="pt-6 text-[0.9rem] text-label-3">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/firmware" className="hover:text-label">Firmware</Link></li>
          <li aria-hidden="true"><IconChevronRight size={16} /></li>
          {project && (
            <>
              <li><Link href={`/projects/${project.slug}`} className="hover:text-label">{project.title}</Link></li>
              <li aria-hidden="true"><IconChevronRight size={16} /></li>
            </>
          )}
          <li className="text-label-2">{manifest.name}</li>
        </ol>
      </nav>

      <header className="pt-6 pb-8 animate-rise">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone} dot>{statusLabel}</Badge>
          {manifest.demo && <Badge tone="warning">Bản demo</Badge>}
          {manifest.tags.map((t) => (
            <Badge key={t} tone="neutral">{t}</Badge>
          ))}
        </div>
        <h1 className="title-large mt-3 text-label">
          {manifest.name} <span className="font-medium text-label-3">v{manifest.version}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-label-2">{manifest.summary}</p>
      </header>

      <Flasher firmwares={[firmware]} showPicker={false} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GroupedList label="Thông tin bản dựng">
          <GroupedRow label="Phát hành" value={formatDateVi(manifest.releasedAt)} />
          {manifest.builds.map((b) => (
            <GroupedRow
              key={b.chipFamily}
              label={b.chipFamily}
              detail={`${b.parts.length} phần · ${b.flashMode === "keep" ? "giữ flash mode" : b.flashMode.toUpperCase()}${b.eraseAll ? " · xoá toàn bộ" : ""}`}
              value={firmware.sizes[b.chipFamily] ? formatBytes(firmware.sizes[b.chipFamily]!) : "—"}
            />
          ))}
          {project && <GroupedRow label="Dự án" value={project.title} href={`/projects/${project.slug}`} />}
          <GroupedRow label="Firmware khác" href="/firmware" />
        </GroupedList>

        <Card padding="lg">
          <h2 className="title-2 text-label">Thay đổi trong phiên bản này</h2>
          {manifest.changelog.length ? (
            <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-label-2">
              {manifest.changelog.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-label-4">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-label-3">Chưa có ghi chú thay đổi.</p>
          )}
        </Card>
      </div>

      <section id="huong-dan" className="mt-16 scroll-mt-20">
        <FlashGuide afterFlash={manifest.afterFlash} projectHref={project ? `/projects/${project.slug}` : undefined} />
      </section>
    </Container>
  );
}
