"use client";

import { useMemo, useState } from "react";
import type { ChipFamily, Protocol } from "@/lib/content/schema";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { ProjectCard, type ProjectCardData } from "./ProjectCard";

type ProtocolFilter = "all" | Protocol;
type ChipFilter = "all" | ChipFamily;

export function ProjectsExplorer({ projects }: { projects: ProjectCardData[] }) {
  const [protocol, setProtocol] = useState<ProtocolFilter>("all");
  const [chip, setChip] = useState<ChipFilter>("all");

  const protocols = useMemo(() => Array.from(new Set(projects.map((p) => p.protocol))), [projects]);
  const chips = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.chips))).sort(), [projects]);

  const filtered = projects.filter((p) => (protocol === "all" || p.protocol === protocol) && (chip === "all" || p.chips.includes(chip)));

  return (
    <div>
      <div className="flex flex-col gap-3">
        <SegmentedControl<ProtocolFilter>
          ariaLabel="Lọc theo giao thức"
          value={protocol}
          onChange={setProtocol}
          options={[
            { value: "all", label: "Tất cả", count: projects.length },
            ...protocols.map((pr) => ({ value: pr, label: pr, count: projects.filter((p) => p.protocol === pr).length })),
          ]}
        />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo chip">
          <button
            type="button"
            onClick={() => setChip("all")}
            aria-pressed={chip === "all"}
            className={cn(
              "h-8 rounded-pill px-3 text-[0.85rem] font-semibold transition-colors",
              chip === "all" ? "bg-label text-on-tint" : "bg-surface text-label-2 border border-separator hover:bg-surface-2",
            )}
          >
            Mọi chip
          </button>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              aria-pressed={chip === c}
              className={cn(
                "h-8 rounded-pill px-3 text-[0.85rem] font-semibold transition-colors",
                chip === c ? "bg-label text-on-tint" : "bg-surface text-label-2 border border-separator hover:bg-surface-2",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[0.9rem] text-label-3" aria-live="polite">
        {filtered.length} dự án
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-card border border-dashed border-separator-strong p-10 text-center text-label-2">
          Chưa có dự án nào khớp bộ lọc. Thử bỏ bớt điều kiện.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
