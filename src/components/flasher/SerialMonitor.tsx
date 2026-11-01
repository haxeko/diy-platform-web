"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconSpinner, IconTerminal, IconX } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

export function SerialMonitor({ lines, open, onClose }: { lines: string[]; open: boolean; onClose: () => void }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearedAt, setClearedAt] = useState(0);
  const ref = useRef<HTMLPreElement>(null);
  const visible = lines.slice(clearedAt);

  useEffect(() => {
    if (autoScroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [visible.length, autoScroll]);

  return (
    <div className="rounded-[16px] border border-separator bg-surface-2 animate-rise">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-[0.9rem] font-semibold text-label-2">
          <IconTerminal size={18} />
          {STRINGS.monitorTitle}
          {open && <IconSpinner size={14} className="text-tint" />}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[0.8rem] text-label-2">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="size-4 accent-[var(--color-tint)]" />
            {STRINGS.monitorAutoScroll}
          </label>
          <button type="button" onClick={() => setClearedAt(lines.length)} className="h-8 rounded-[10px] bg-fill px-2.5 text-[0.8rem] font-semibold text-label-2 hover:text-label">
            {STRINGS.monitorClear}
          </button>
          <CopyButton value={visible.join("\n")} size="sm" label={STRINGS.monitorCopy} />
          <button
            type="button"
            onClick={onClose}
            aria-label={STRINGS.closeSerial}
            className={cn("flex size-8 items-center justify-center rounded-[10px] text-label-2 hover:bg-fill hover:text-label")}
          >
            <IconX size={16} />
          </button>
        </div>
      </div>
      <pre
        ref={ref}
        tabIndex={0}
        className="max-h-72 overflow-auto rounded-b-[16px] border-t border-separator bg-[#1d1d20] px-4 py-3 font-mono text-[0.78rem] leading-relaxed text-[#d9d9e0]"
      >
        {visible.length ? visible.join("\n") : STRINGS.monitorWaiting}
      </pre>
    </div>
  );
}
