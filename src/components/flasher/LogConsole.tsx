"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconChevronDown, IconTerminal } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

export function LogConsole({ lines, forceOpen = false }: { lines: string[]; forceOpen?: boolean }) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? forceOpen;
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines, open]);

  return (
    <div className="rounded-[16px] border border-separator bg-surface-2">
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          onClick={() => setUserOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left text-[0.9rem] font-semibold text-label-2 hover:text-label"
        >
          <IconTerminal size={18} />
          {STRINGS.log}
          <span className="ml-1 tabular text-label-4">{lines.length}</span>
          <IconChevronDown size={18} className={cn("ml-auto transition-transform duration-200", open && "rotate-180")} />
        </button>
        {open && lines.length > 0 && <CopyButton value={lines.join("\n")} label={STRINGS.copyLog} size="sm" />}
      </div>
      {open && (
        <pre
          ref={ref}
          tabIndex={0}
          className="max-h-64 overflow-auto rounded-b-[16px] border-t border-separator bg-[#1d1d20] px-4 py-3 font-mono text-[0.78rem] leading-relaxed text-[#d9d9e0]"
        >
          {lines.length ? lines.join("\n") : "— chưa có dữ liệu —"}
        </pre>
      )}
    </div>
  );
}
