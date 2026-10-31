import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronRight } from "./Icons";

export function SectionHeader({
  title,
  description,
  href,
  linkLabel = "Xem tất cả",
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="title-1 text-label">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-label-2 text-pretty">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-0.5 text-[0.95rem] font-semibold text-tint hover:underline underline-offset-4">
          {linkLabel}
          <IconChevronRight size={18} />
        </Link>
      )}
    </div>
  );
}
