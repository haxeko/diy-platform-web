import Link from "next/link";
import type { SiteConfig } from "@/lib/content/site";
import { NAV_ITEMS } from "./nav-items";
import { IconBolt } from "@/components/ui/Icons";

export function Footer({ site }: { site: SiteConfig }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 hairline-t bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-label">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-tint text-on-tint">
              <IconBolt size={16} />
            </span>
            {site.name}
          </Link>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-label-2">{site.description}</p>
        </div>
        <nav aria-label="Chân trang">
          <p className="eyebrow mb-3">Khám phá</p>
          <ul className="space-y-2 text-[0.95rem]">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-label-2 hover:text-label">
                  {i.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/bao-ve-firmware" className="text-label-2 hover:text-label">
                Bảo vệ firmware
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="eyebrow mb-3">Liên hệ</p>
          <ul className="space-y-2 text-[0.95rem] text-label-2">
            <li>{site.author.name}</li>
            {site.author.email && (
              <li>
                <a href={`mailto:${site.author.email}`} className="hover:text-label">
                  {site.author.email}
                </a>
              </li>
            )}
            {site.author.github && (
              <li>
                <a href={`https://github.com/${site.author.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-label">
                  GitHub · {site.author.github}
                </a>
              </li>
            )}
            {site.author.youtube && (
              <li>
                <a href={site.author.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-label">
                  YouTube
                </a>
              </li>
            )}
            {site.author.facebook && (
              <li>
                <a href={site.author.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-label">
                  Facebook
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="hairline-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[0.82rem] text-label-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {site.name}. {site.footer.license}
          </p>
          {site.footer.disclaimer && <p className="max-w-2xl text-pretty">{site.footer.disclaimer}</p>}
        </div>
      </div>
    </footer>
  );
}
