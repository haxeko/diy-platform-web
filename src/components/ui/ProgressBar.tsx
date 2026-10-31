import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** 0..1 */
  value?: number;
  indeterminate?: boolean;
  tone?: "tint" | "success" | "danger";
  label: string;
  className?: string;
  size?: "sm" | "md";
}

const tones = { tint: "bg-tint", success: "bg-success", danger: "bg-danger" };

export function ProgressBar({ value = 0, indeterminate, tone = "tint", label, className, size = "md" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuetext={indeterminate ? "Đang xử lý" : `${pct}%`}
      className={cn("relative w-full overflow-hidden rounded-pill bg-fill", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      {indeterminate ? (
        <div className={cn("absolute inset-y-0 w-1/3 rounded-pill animate-indeterminate", tones[tone])} />
      ) : (
        <div
          className={cn("h-full rounded-pill transition-[width] duration-300 ease-[var(--ease-ios)]", tones[tone])}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
