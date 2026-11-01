"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import type { FirmwarePublic } from "@/lib/flash/shared";
import { formatBytes, formatDateVi } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { IconCheck } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

export interface ProjectRef {
  slug: string;
  title: string;
}

export function FirmwarePicker({
  firmwares,
  selectedId,
  onSelect,
  disabled,
  projects,
}: {
  firmwares: FirmwarePublic[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  projects?: Record<string, ProjectRef>;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="eyebrow mb-2 px-1">{STRINGS.pickFirmware}</legend>
      {disabled && <p className="mb-2 px-1 text-[0.8rem] text-label-3">Ngắt kết nối hoặc nhấn “Nạp board khác” để đổi firmware.</p>}
      <div className="grid gap-2">
        {firmwares.map((fw) => {
          const active = fw.id === selectedId;
          const size = Object.values(fw.sizes)[0];
          return (
            <label
              key={fw.id}
              className={cn(
                "relative flex w-full cursor-pointer items-start gap-3 rounded-[16px] border px-4 py-3 transition-all duration-200 ease-[var(--ease-ios)] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[color-mix(in_srgb,var(--color-tint)_45%,transparent)]",
                active ? "border-tint bg-tint-soft-2 shadow-[0_0_0_3px_rgb(10_122_255/0.12)]" : "border-separator bg-surface hover:bg-surface-2",
                disabled && "cursor-default opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={fw.id}
                checked={active}
                onChange={() => onSelect(fw.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-tint bg-tint text-on-tint" : "border-separator-strong bg-surface",
                )}
              >
                {active && <IconCheck size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-label">{fw.name}</span>
                  <span className="text-[0.85rem] text-label-3 tabular">v{fw.version}</span>
                  {fw.demo && <Badge tone="warning" size="sm">{STRINGS.demoBadge}</Badge>}
                  {fw.status === "beta" && <Badge tone="lavender" size="sm">{STRINGS.betaBadge}</Badge>}
                </span>
                {projects?.[fw.project] && <span className="mt-0.5 block text-[0.85rem] text-label-3">{projects[fw.project].title}</span>}
                <span className="mt-1 block text-[0.9rem] text-label-2">{fw.summary}</span>
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  {fw.chips.map((c) => (
                    <Badge key={c} tone="sky" size="sm">
                      {c}
                    </Badge>
                  ))}
                  <span className="ml-1 text-[0.8rem] text-label-3 tabular">
                    {size ? formatBytes(size) : null}
                    {size ? " · " : null}
                    {formatDateVi(fw.releasedAt)}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
