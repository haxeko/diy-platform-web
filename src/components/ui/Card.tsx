import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Accent } from "@/lib/content/schema";

type Padding = "none" | "sm" | "md" | "lg";

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  padding?: Padding;
  interactive?: boolean;
  /** Soft pastel background instead of white. */
  tint?: Accent | "tint";
  children?: ReactNode;
}

const tints: Record<NonNullable<CardProps["tint"]>, string> = {
  tint: "bg-tint-soft",
  sky: "bg-sky-soft",
  mint: "bg-mint-soft",
  lavender: "bg-lavender-soft",
  peach: "bg-peach-soft",
  lemon: "bg-lemon-soft",
  rose: "bg-rose-soft",
  graphite: "bg-graphite-soft",
};

export function Card({ as, padding = "md", interactive, tint, className, children, ...rest }: CardProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn(
        "rounded-card border border-separator",
        tint ? tints[tint] : "bg-surface shadow-card",
        paddings[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-300 ease-[var(--ease-ios)] hover:-translate-y-0.5 hover:shadow-card-hover focus-within:shadow-card-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
