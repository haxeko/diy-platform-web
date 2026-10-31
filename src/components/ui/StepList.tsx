import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Step {
  title: ReactNode;
  body?: ReactNode;
}

export function StepList({ steps, start = 1, className }: { steps: Step[]; start?: number; className?: string }) {
  return (
    <ol className={cn("space-y-4", className)} start={start}>
      {steps.map((s, i) => (
        <li key={i} className="flex gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-tint-soft text-[0.9rem] font-bold text-tint-strong tabular"
          >
            {start + i}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="font-semibold text-label">{s.title}</div>
            {s.body && <div className="mt-1 text-[0.95rem] leading-relaxed text-label-2">{s.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
