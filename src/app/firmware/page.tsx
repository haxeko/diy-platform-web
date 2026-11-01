import type { Metadata } from "next";
import Link from "next/link";
import { Flasher } from "@/components/flasher/Flasher";
import { FlashGuide } from "@/components/firmware/FlashGuide";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { getFirmwareManifests, getProjects } from "@/lib/content/load";
import { toFirmwarePublic } from "@/lib/flash/server/public";
import { normalizeChipName } from "@/lib/flash/shared";

export const metadata: Metadata = {
  title: "Firmware",
  description: "Cắm bo mạch ESP, chọn firmware, chip được nhận diện và nạp tự động ngay trên trình duyệt.",
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FirmwarePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const fw = first(sp.fw);
  const chip = first(sp.chip);
  const [manifests, projects] = await Promise.all([getFirmwareManifests(), getProjects()]);
  const published = manifests.filter((m) => m.status !== "deprecated");
  const all = await Promise.all(published.map(toFirmwarePublic));
  const chipFilter = chip ? normalizeChipName(chip) : null;
  const firmwares = chipFilter ? all.filter((f) => f.chips.some((c) => normalizeChipName(c) === chipFilter)) : all;
  const projectRefs = Object.fromEntries(projects.map((p) => [p.slug, { slug: p.slug, title: p.title }]));
  const initialId = fw && firmwares.some((f) => f.id === fw) ? fw : undefined;

  return (
    <Container className="pb-16">
      <PageHeader
        eyebrow="Firmware"
        title="Cắm vào, chọn firmware, nhấn Flash."
        description="Chip được nhận diện tự động và nạp ngay trên trình duyệt. Không cần cài phần mềm, không có file tải về."
      />

      {chipFilter && (
        <Callout tone="info" className="mb-5" role="note">
          Đang lọc firmware cho <strong className="font-semibold text-label">{chipFilter}</strong>.{" "}
          <Link href="/firmware" className="font-semibold text-tint underline-offset-4 hover:underline">Xem tất cả</Link>
        </Callout>
      )}

      <Flasher key={`${initialId ?? ""}-${chipFilter ?? ""}`} firmwares={firmwares} initialId={initialId} projects={projectRefs} />

      <section id="huong-dan" className="mt-16 scroll-mt-20">
        <FlashGuide />
      </section>
    </Container>
  );
}
