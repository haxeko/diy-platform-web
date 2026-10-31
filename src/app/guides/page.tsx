import type { Metadata } from "next";
import { GuideCard } from "@/components/guides/GuideCard";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { GUIDE_CATEGORIES, type GuideCategory } from "@/lib/content/schema";
import { getGuides } from "@/lib/content/load";
import { GUIDE_CATEGORY_LABEL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Hướng dẫn",
  description: "Hướng dẫn từng bước: nạp firmware qua trình duyệt, driver USB, ghép đôi Matter, Thread Border Router, Home Assistant.",
};

export default async function GuidesPage() {
  const guides = await getGuides();
  const groups = GUIDE_CATEGORIES.map((c) => ({ category: c as GuideCategory, items: guides.filter((g) => g.category === c) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <Container className="pb-16">
      <PageHeader
        eyebrow="Hướng dẫn"
        title="Từ cắm USB đến ghép đôi Matter."
        description="Bài viết ngắn, đi thẳng vào việc: chuẩn bị phần cứng, nạp firmware, đưa thiết bị vào Apple Home, Google Home hay Home Assistant và xử lý khi có lỗi."
      />

      {groups.length === 0 && <p className="text-label-2">Chưa có hướng dẫn nào.</p>}

      <div className="space-y-12">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`cat-${g.category}`}>
            <h2 id={`cat-${g.category}`} className="eyebrow mb-4">
              {GUIDE_CATEGORY_LABEL[g.category]}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {g.items.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
