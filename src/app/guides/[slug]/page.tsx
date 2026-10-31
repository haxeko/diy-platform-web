import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/Markdown";
import { GuideCard } from "@/components/guides/GuideCard";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { GroupedList, GroupedRow } from "@/components/ui/GroupedList";
import { IconChevronRight } from "@/components/ui/Icons";
import { getGuide, getGuides, getProjects } from "@/lib/content/load";
import { formatDateVi, GUIDE_CATEGORY_LABEL } from "@/lib/format";

export async function generateStaticParams() {
  const guides = await getGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return { title: "Không tìm thấy hướng dẫn" };
  return { title: guide.title, description: guide.summary };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();
  const [guides, projects] = await Promise.all([getGuides(), getProjects()]);
  const related = guides.filter((g) => g.slug !== guide.slug && g.category === guide.category).slice(0, 2);
  const linkedProjects = projects.filter((p) => guide.projects.includes(p.slug) || p.guides.includes(guide.slug));

  return (
    <Container size="md" className="pb-16">
      <nav aria-label="Đường dẫn" className="pt-6 text-[0.9rem] text-label-3">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/guides" className="hover:text-label">Hướng dẫn</Link></li>
          <li aria-hidden="true"><IconChevronRight size={16} /></li>
          <li className="text-label-2">{GUIDE_CATEGORY_LABEL[guide.category]}</li>
        </ol>
      </nav>

      <header className="pt-6 pb-8 animate-rise">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="tint">{GUIDE_CATEGORY_LABEL[guide.category]}</Badge>
          <span className="text-[0.85rem] text-label-3">Cập nhật {formatDateVi(guide.updatedAt)}</span>
        </div>
        <h1 className="title-large mt-3 text-label">{guide.title}</h1>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-label-2">{guide.summary}</p>
      </header>

      <article className="rounded-card border border-separator bg-surface p-6 shadow-card sm:p-8">
        <Markdown>{guide.body}</Markdown>
      </article>

      {linkedProjects.length > 0 && (
        <GroupedList label="Dự án liên quan" className="mt-8">
          {linkedProjects.map((p) => (
            <GroupedRow key={p.slug} label={p.title} detail={p.summary} href={`/projects/${p.slug}`} icon={<span aria-hidden="true">{p.icon}</span>} />
          ))}
        </GroupedList>
      )}

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-guides">
          <h2 id="related-guides" className="title-2 mb-4 text-label">
            Đọc tiếp
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {related.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
