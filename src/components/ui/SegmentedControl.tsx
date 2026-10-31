"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[12px] bg-fill p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[0.875rem] font-semibold transition-all duration-200 ease-[var(--ease-ios)]",
              active ? "bg-surface text-label shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-label-2 hover:text-label",
            )}
          >
            {o.label}
            {typeof o.count === "number" && <span className={cn("tabular text-[0.75rem]", active ? "text-label-3" : "text-label-4")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
