import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/Markdown";
import { GuideCard } from "@/components/guides/GuideCard";
import { ACCENT_SOFT_BG, ACCENT_TEXT } from "@/components/projects/accent";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { GroupedList, GroupedRow } from "@/components/ui/GroupedList";
import { IconBolt, IconCheck, IconChevronRight, IconHeart } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { getFirmwareForProject, getGuides, getProject, getProjects } from "@/lib/content/load";
import { DIFFICULTY_LABEL, formatDateVi, formatMinutes, PROTOCOL_TONE } from "@/lib/format";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Không tìm thấy dự án" };
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  const [firmware, guides, projects] = await Promise.all([getFirmwareForProject(project.slug), getGuides(), getProjects()]);
  const published = firmware.filter((f) => f.status !== "deprecated");
  const relatedGuides = guides.filter((g) => project.guides.includes(g.slug) || g.projects.includes(project.slug)).slice(0, 4);
  const more = projects.filter((p) => p.slug !== project.slug && (p.protocol === project.protocol || p.chips.some((c) => project.chips.includes(c)))).slice(0, 3);

  return (
    <Container className="pb-16">
      <nav aria-label="Đường dẫn" className="pt-6 text-[0.9rem] text-label-3">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/du-an" className="hover:text-label">Dự án</Link></li>
          <li aria-hidden="true"><IconChevronRight size={16} /></li>
          <li className="text-label-2">{project.title}</li>
        </ol>
      </nav>

      <header className="grid gap-6 pt-6 pb-8 animate-rise lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PROTOCOL_TONE[project.protocol]}>{project.protocol}</Badge>
            {project.chips.map((c) => (
              <Badge key={c} tone="neutral">
                {c}
              </Badge>
            ))}
            <Badge tone="tint">{DIFFICULTY_LABEL[project.difficulty]}</Badge>
          </div>
          <h1 className="title-large mt-4 text-label">{project.title}</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-label-2">{project.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {published.length > 0 ? (
              <Button href={`/firmware/${published[0].id}`} size="lg" icon={<IconBolt size={20} />}>
                Flash firmware
              </Button>
            ) : (
              <Button size="lg" disabled>
                Firmware sắp ra mắt
              </Button>
            )}
            <Button href="#chi-tiet" size="lg" variant="tinted">
              Xem hướng dẫn
            </Button>
          </div>
        </div>
        <div className={cn("flex aspect-[4/3] items-center justify-center rounded-card-lg", ACCENT_SOFT_BG[project.accent])}>
          <span className={cn("text-7xl drop-shadow-sm", ACCENT_TEXT[project.accent])} aria-hidden="true">
            {project.icon}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {project.features.length > 0 && (
            <Card padding="lg">
              <h2 className="title-2 text-label">Tính năng</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {project.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.95rem] text-label-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <IconCheck size={13} strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card padding="lg" id="chi-tiet" className="scroll-mt-20">
            <Markdown>{project.body}</Markdown>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
          {published.length > 0 && (
            <GroupedList label="Firmware">
              {published.map((f) => (
                <GroupedRow
                  key={f.id}
                  label={`${f.name} v${f.version}`}
                  detail={`${f.builds.map((b) => b.chipFamily).join(", ")} · ${formatDateVi(f.releasedAt)}${f.demo ? " · bản demo" : ""}`}
                  href={`/firmware/${f.id}`}
                  icon={<IconBolt size={16} />}
                />
              ))}
            </GroupedList>
          )}

          <GroupedList label="Thông tin">
            <GroupedRow label="Giao thức" value={project.protocol} />
            <GroupedRow label="Chip" value={project.chips.join(", ")} />
            <GroupedRow label="Độ khó" value={DIFFICULTY_LABEL[project.difficulty]} />
            <GroupedRow label="Thời gian" value={formatMinutes(project.timeMinutes)} />
            <GroupedRow label="Cập nhật" value={formatDateVi(project.updatedAt)} />
          </GroupedList>

          {project.bom.length > 0 && (
            <GroupedList label="Linh kiện">
              {project.bom.map((item, i) => (
                <GroupedRow key={`${item.name}-${i}`} label={item.name} detail={item.note} value={`×${item.qty}`} />
              ))}
            </GroupedList>
          )}

          <Card padding="md" tint="rose">
            <div className="flex items-start gap-3">
              <IconHeart size={20} className="mt-0.5 shrink-0 text-rose" />
              <div>
                <p className="font-semibold text-label">Dự án hữu ích?</p>
                <p className="mt-1 text-[0.9rem] text-label-2">Ủng hộ một ly cà phê để mình duy trì máy chủ và làm thêm dự án mới.</p>
                <Link href="/ung-ho" className="mt-2 inline-block text-[0.9rem] font-semibold text-rose underline-offset-4 hover:underline">
                  Đến trang ủng hộ →
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {relatedGuides.length > 0 && (
        <section className="mt-14" aria-labelledby="related-guides">
          <h2 id="related-guides" className="title-1 mb-5 text-label">
            Hướng dẫn liên quan
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedGuides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-14" aria-labelledby="more-projects">
          <h2 id="more-projects" className="title-1 mb-5 text-label">
            Dự án tương tự
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
