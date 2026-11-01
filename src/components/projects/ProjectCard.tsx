import Link from "next/link";
import type { Project } from "@/lib/content/schema";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconClock } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { DIFFICULTY_LABEL, formatMinutes, PROTOCOL_TONE } from "@/lib/format";
import { ACCENT_SOFT_BG, ACCENT_TEXT } from "./accent";

export type ProjectCardData = Pick<
  Project,
  "slug" | "title" | "summary" | "protocol" | "chips" | "difficulty" | "timeMinutes" | "accent" | "icon" | "featured" | "firmware"
>;

export function ProjectCard({ project, className }: { project: ProjectCardData; className?: string }) {
  return (
    <Card as="article" padding="none" interactive className={cn("overflow-hidden", className)}>
      <Link href={`/du-an/${project.slug}`} className="flex h-full flex-col outline-none">
        <div className={cn("flex h-36 items-center justify-center", ACCENT_SOFT_BG[project.accent])}>
          <span className={cn("text-5xl drop-shadow-sm", ACCENT_TEXT[project.accent])} aria-hidden="true">
            {project.icon}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={PROTOCOL_TONE[project.protocol]} size="sm">
              {project.protocol}
            </Badge>
            {project.chips.slice(0, 2).map((c) => (
              <Badge key={c} tone="neutral" size="sm">
                {c}
              </Badge>
            ))}
            {project.chips.length > 2 && (
              <Badge tone="neutral" size="sm">
                +{project.chips.length - 2}
              </Badge>
            )}
          </div>
          <h3 className="mt-3 text-[1.1rem] font-semibold leading-snug text-label">{project.title}</h3>
          <p className="mt-1.5 line-clamp-3 text-[0.95rem] leading-relaxed text-label-2">{project.summary}</p>
          <div className="mt-auto flex items-center gap-3 pt-4 text-[0.82rem] text-label-3">
            <span className="inline-flex items-center gap-1">
              <IconClock size={15} />
              {formatMinutes(project.timeMinutes)}
            </span>
            <span>·</span>
            <span>{DIFFICULTY_LABEL[project.difficulty]}</span>
            {project.firmware.length > 0 && (
              <>
                <span>·</span>
                <span className="font-semibold text-tint">Có firmware</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}
