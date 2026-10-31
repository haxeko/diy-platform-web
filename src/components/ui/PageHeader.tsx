import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  align?: "left" | "center";
}

export function PageHeader({ eyebrow, title, description, actions, className, align = "left" }: PageHeaderProps) {
  return (
    <header className={cn("pt-10 pb-8 sm:pt-14 sm:pb-10 animate-rise", align === "center" && "text-center", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="title-large text-balance text-label">{title}</h1>
      {description && (
        <p className={cn("mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-label-2 text-pretty", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
      {actions && <div className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}>{actions}</div>}
    </header>
  );
}
