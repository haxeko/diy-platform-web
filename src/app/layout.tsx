import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";
import { getSiteConfig } from "@/lib/content/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
    description: site.description,
    applicationName: site.name,
    metadataBase: site.url ? new URL(site.url) : undefined,
    openGraph: { title: site.name, description: site.description, type: "website", locale: "vi_VN", siteName: site.name },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const site = await getSiteConfig();
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-surface focus:px-4 focus:py-2 focus:text-tint focus:shadow-card"
        >
          Bỏ qua điều hướng
        </a>
        <NavBar siteName={site.shortName} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer site={site} />
      </body>
    </html>
  );
}
