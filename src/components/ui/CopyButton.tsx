"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { IconCheck, IconCopy } from "./Icons";

export function CopyButton({
  value,
  label = "Sao chép",
  copiedLabel = "Đã sao chép",
  className,
  size = "md",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Fallback for older browsers: select-and-prompt is intrusive; silently ignore.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] font-semibold transition-colors",
        size === "sm" ? "h-8 px-2.5 text-[0.8rem]" : "h-9 px-3 text-[0.875rem]",
        copied ? "bg-success-soft text-[#1b7a3a]" : "bg-tint-soft text-tint-strong hover:bg-[#d8e7ff]",
        className,
      )}
    >
      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
