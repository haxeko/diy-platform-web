import QRCode from "qrcode";
import { cn } from "@/lib/cn";

/** Server-rendered SVG QR code (no client JS). */
export async function QrCode({ value, size = 180, className, label }: { value: string; size?: number; className?: string; label: string }) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1c1c1e", light: "#ffffff00" },
  });
  // qrcode emits a complete <svg> element; we size it via the wrapper.
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("inline-block rounded-[18px] bg-white p-3 shadow-card border border-separator [&>svg]:h-full [&>svg]:w-full", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
