"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Client-side SVG QR (for values only known in the browser, e.g. a Matter pairing payload). */
export function ClientQr({ value, size = 160, label, className }: { value: string; size?: number; label: string; className?: string }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toString(value, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#1c1c1e", light: "#ffffff00" } }),
      )
      .then((s) => {
        if (alive) setSvg(s);
      })
      .catch(() => {
        if (alive) setSvg("");
      });
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("inline-block rounded-[18px] border border-separator bg-white p-3 shadow-card [&>svg]:h-full [&>svg]:w-full", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
