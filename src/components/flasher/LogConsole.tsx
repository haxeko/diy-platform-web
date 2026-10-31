"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown, IconTerminal } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

export function LogConsole({ lines, defaultOpen = false }: { lines: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines, open]);

  return (
    <div className="rounded-[16px] border border-separator bg-surface-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[0.9rem] font-semibold text-label-2 hover:text-label"
      >
        <IconTerminal size={18} />
        {STRINGS.log}
        <span className="ml-1 tabular text-label-4">{lines.length}</span>
        <IconChevronDown size={18} className={cn("ml-auto transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <pre
          ref={ref}
          aria-live="polite"
          className="max-h-64 overflow-auto border-t border-separator bg-[#1d1d20] px-4 py-3 font-mono text-[0.78rem] leading-relaxed text-[#d9d9e0] rounded-b-[16px]"
        >
          {lines.length ? lines.join("\n") : "— chưa có dữ liệu —"}
        </pre>
      )}
    </div>
  );
}
