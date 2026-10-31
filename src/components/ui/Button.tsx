import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconSpinner } from "./Icons";

type Variant = "primary" | "secondary" | "tinted" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[var(--ease-ios)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-tint text-on-tint hover:bg-tint-strong shadow-[0_6px_18px_-8px_rgb(10_122_255/0.6)]",
  secondary: "bg-surface text-label border border-separator-strong hover:bg-surface-2",
  tinted: "bg-tint-soft text-tint-strong hover:bg-[#d8e7ff]",
  ghost: "bg-transparent text-tint hover:bg-fill-2",
  danger: "bg-danger-soft text-danger hover:bg-[#ffd9d6]",
  success: "bg-success text-on-tint hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.9rem] rounded-[10px]",
  md: "h-11 px-5 text-[0.95rem] rounded-control",
  lg: "h-[52px] px-6 text-[1.05rem] rounded-[14px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type ButtonAsButton = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & { href: string; external?: boolean };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", loading, fullWidth, icon, iconRight, className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
  const content = (
    <>
      {loading ? <IconSpinner size={size === "sm" ? 16 : 18} /> : icon}
      {children}
      {iconRight}
    </>
  );

  if ("href" in props && typeof props.href === "string") {
    const { href, external, variant: _v, size: _s, loading: _l, fullWidth: _f, icon: _i, iconRight: _ir, className: _c, children: _ch, ...rest } = props;
    void _v; void _s; void _l; void _f; void _i; void _ir; void _c; void _ch;
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  const { variant: _v, size: _s, loading: _l, fullWidth: _f, icon: _i, iconRight: _ir, className: _c, children: _ch, type, disabled, ...rest } = props as ButtonAsButton;
  void _v; void _s; void _l; void _f; void _i; void _ir; void _c; void _ch;
  return (
    <button type={type ?? "button"} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
