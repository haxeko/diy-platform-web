import type { MetadataRoute } from "next";
import { getFirmwareManifests, getGuides, getProjects } from "@/lib/content/load";
import { getSiteConfig } from "@/lib/content/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, projects, firmware, guides] = await Promise.all([getSiteConfig(), getProjects(), getFirmwareManifests(), getGuides()]);
  const base = (site.url ?? "http://localhost:3000").replace(/\/$/, "");
  const url = (p: string) => `${base}${p}`;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/du-an"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/firmware"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/huong-dan"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/ung-ho"), changeFrequency: "yearly", priority: 0.4 },
    { url: url("/bao-ve-firmware"), changeFrequency: "yearly", priority: 0.4 },
    ...projects.map((p) => ({ url: url(`/du-an/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...firmware.filter((f) => f.status !== "deprecated").map((f) => ({ url: url(`/firmware/${f.id}`), lastModified: f.releasedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...guides.map((g) => ({ url: url(`/huong-dan/${g.slug}`), lastModified: g.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
