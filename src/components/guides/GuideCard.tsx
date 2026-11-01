import Link from "next/link";
import type { Guide } from "@/lib/content/schema";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconChevronRight } from "@/components/ui/Icons";
import { formatDateVi, GUIDE_CATEGORY_LABEL } from "@/lib/format";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Card as="article" padding="none" interactive className="relative">
      <Link href={`/huong-dan/${guide.slug}`} className="flex items-start gap-4 p-5 outline-none">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="tint" size="sm">
              {GUIDE_CATEGORY_LABEL[guide.category]}
            </Badge>
            <span className="text-[0.8rem] text-label-3">Cập nhật {formatDateVi(guide.updatedAt)}</span>
          </div>
          <h3 className="mt-2 text-[1.1rem] font-semibold leading-snug text-label">{guide.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-[0.95rem] leading-relaxed text-label-2">{guide.summary}</p>
        </div>
        <IconChevronRight size={20} className="mt-1 shrink-0 text-label-4" />
      </Link>
    </Card>
  );
}
