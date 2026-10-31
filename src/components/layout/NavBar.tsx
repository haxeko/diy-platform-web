"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { IconBolt, IconMenu, IconX } from "@/components/ui/Icons";
import { NAV_ITEMS } from "./nav-items";

export function NavBar({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass hairline-b">
      <nav aria-label="Chính" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-label">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-tint text-on-tint shadow-[0_4px_12px_-4px_rgb(10_122_255/0.7)]">
            <IconBolt size={18} />
          </span>
          <span>{siteName}</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-[10px] px-3.5 py-2 text-[0.95rem] font-medium transition-colors",
                    active ? "bg-fill text-label" : "text-label-2 hover:bg-fill-2 hover:text-label",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="ml-2">
            <Link
              href="/firmware"
              className="inline-flex h-9 items-center rounded-[10px] bg-tint px-4 text-[0.9rem] font-semibold text-on-tint shadow-[0_6px_16px_-8px_rgb(10_122_255/0.7)] hover:bg-tint-strong"
            >
              Flash ngay
            </Link>
          </li>
        </ul>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-[10px] text-label-2 hover:bg-fill-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>

      {open && (
        <div id="mobile-nav" className="md:hidden hairline-t">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("block rounded-[12px] px-4 py-3 text-[1rem] font-medium", active ? "bg-fill text-label" : "text-label-2 hover:bg-fill-2")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
