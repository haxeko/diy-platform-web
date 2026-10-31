import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "./Icons";

/** iOS Settings-style inset grouped list. */
export function GroupedList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={className}>
      {label && <p className="eyebrow mb-2 px-1">{label}</p>}
      <div className="overflow-hidden rounded-card border border-separator bg-surface shadow-card divide-y divide-separator">{children}</div>
    </div>
  );
}

export interface GroupedRowProps {
  label: ReactNode;
  value?: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  href?: string;
  trailing?: ReactNode;
  className?: string;
  mono?: boolean;
}

export function GroupedRow({ label, value, detail, icon, href, trailing, className, mono }: GroupedRowProps) {
  const inner = (
    <>
      {icon && <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-tint-soft text-tint-strong">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[0.95rem] font-medium text-label">{label}</div>
        {detail && <div className="mt-0.5 text-[0.85rem] text-label-3">{detail}</div>}
      </div>
      {value !== undefined && (
        <div className={cn("shrink-0 text-right text-[0.95rem] text-label-2 tabular", mono && "font-mono text-[0.85rem]")}>{value}</div>
      )}
      {trailing}
      {href && <IconChevronRight size={18} className="shrink-0 text-label-4" />}
    </>
  );
  const classes = cn("flex items-center gap-3 px-4 py-3 min-h-[52px]", href && "hover:bg-surface-2 transition-colors", className);
  return href ? (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  ) : (
    <div className={classes}>{inner}</div>
  );
}
