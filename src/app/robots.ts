import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/content/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteConfig();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: site.url ? `${site.url.replace(/\/$/, "")}/sitemap.xml` : undefined,
  };
}
