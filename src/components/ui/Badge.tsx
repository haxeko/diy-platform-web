import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { Accent } from "@/lib/content/schema";

export type BadgeTone = Accent | "tint" | "success" | "warning" | "danger" | "neutral";

const tones: Record<BadgeTone, string> = {
  tint: "bg-tint-soft text-tint-strong",
  success: "bg-success-soft text-[#1b7a3a]",
  warning: "bg-warning-soft text-[#8a5300]",
  danger: "bg-danger-soft text-[#b4261e]",
  neutral: "bg-fill text-label-2",
  sky: "bg-sky-soft text-sky",
  mint: "bg-mint-soft text-mint",
  lavender: "bg-lavender-soft text-lavender",
  peach: "bg-peach-soft text-peach",
  lemon: "bg-lemon-soft text-lemon",
  rose: "bg-rose-soft text-rose",
  graphite: "bg-graphite-soft text-graphite",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ tone = "neutral", size = "md", dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold leading-none whitespace-nowrap",
        size === "sm" ? "px-2 py-1 text-[0.72rem]" : "px-2.5 py-1.5 text-[0.8rem]",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />}
      {children}
    </span>
  );
}
