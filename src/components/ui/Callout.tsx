import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconCheckCircle, IconInfo, IconWarning, IconX } from "./Icons";

export type CalloutTone = "info" | "success" | "warning" | "danger";

const styles: Record<CalloutTone, { wrap: string; icon: string; Icon: typeof IconInfo }> = {
  info: { wrap: "bg-tint-soft-2 border-[#cfe0ff]", icon: "text-tint", Icon: IconInfo },
  success: { wrap: "bg-success-soft border-[#bfe9cc]", icon: "text-success", Icon: IconCheckCircle },
  warning: { wrap: "bg-warning-soft border-[#f7dcae]", icon: "text-warning", Icon: IconWarning },
  danger: { wrap: "bg-danger-soft border-[#f7c2bd]", icon: "text-danger", Icon: IconX },
};

export interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  role?: "status" | "alert" | "note";
}

export function Callout({ tone = "info", title, children, icon, className, role }: CalloutProps) {
  const s = styles[tone];
  const ariaRole = role === "note" ? undefined : role ?? (tone === "danger" ? "alert" : "status");
  return (
    <div role={ariaRole} className={cn("flex gap-3 rounded-[16px] border px-4 py-3.5 text-[0.95rem] leading-relaxed", s.wrap, className)}>
      <span className={cn("mt-0.5 shrink-0", s.icon)} aria-hidden="true">
        {icon ?? <s.Icon size={20} />}
      </span>
      <div className="min-w-0 flex-1 text-label">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn("text-label-2", title ? "mt-0.5" : undefined)}>{children}</div>}
      </div>
    </div>
  );
}
