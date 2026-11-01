import "server-only";
import { getFirmwareManifests, getGuides, getProjects } from "./load";

/**
 * Cross-checks references between projects, firmware manifests and guides so a
 * dangling slug fails the build (or shows an error overlay in dev) instead of
 * rendering a contradictory page.
 */
export async function assertContentIntegrity(): Promise<void> {
  const [projects, firmware, guides] = await Promise.all([getProjects(), getFirmwareManifests(), getGuides()]);
  const projectSlugs = new Set(projects.map((p) => p.slug));
  const firmwareIds = new Set(firmware.map((f) => f.id));
  const guideSlugs = new Set(guides.map((g) => g.slug));
  const problems: string[] = [];

  for (const p of projects) {
    for (const id of p.firmware) {
      if (!firmwareIds.has(id)) problems.push(`projects/${p.slug}.md → firmware "${id}" không tồn tại (content/firmware/${id}.json)`);
      else {
        const m = firmware.find((f) => f.id === id)!;
        if (m.project !== p.slug) problems.push(`firmware/${id}.json có "project": "${m.project}" nhưng được dự án "${p.slug}" tham chiếu`);
      }
    }
    for (const g of p.guides) if (!guideSlugs.has(g)) problems.push(`projects/${p.slug}.md → guide "${g}" không tồn tại`);
  }
  for (const f of firmware) {
    if (!projectSlugs.has(f.project)) problems.push(`firmware/${f.id}.json → project "${f.project}" không tồn tại`);
  }
  for (const g of guides) {
    for (const p of g.projects) if (!projectSlugs.has(p)) problems.push(`guides/${g.slug}.md → project "${p}" không tồn tại`);
  }

  if (problems.length) throw new Error(`Nội dung không nhất quán:\n- ${problems.join("\n- ")}`);
}

let memo: Promise<void> | null = null;
/** Memoised in production (content is immutable after build); re-run on every call in development. */
export function ensureContentIntegrity(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    memo ??= assertContentIntegrity();
    return memo;
  }
  return assertContentIntegrity();
}
