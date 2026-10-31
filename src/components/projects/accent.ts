import type { Accent } from "@/lib/content/schema";

/** Static class maps so Tailwind can see every class name. */
export const ACCENT_SOFT_BG: Record<Accent, string> = {
  sky: "bg-sky-soft",
  mint: "bg-mint-soft",
  lavender: "bg-lavender-soft",
  peach: "bg-peach-soft",
  lemon: "bg-lemon-soft",
  rose: "bg-rose-soft",
  graphite: "bg-graphite-soft",
};

export const ACCENT_TEXT: Record<Accent, string> = {
  sky: "text-sky",
  mint: "text-mint",
  lavender: "text-lavender",
  peach: "text-peach",
  lemon: "text-lemon",
  rose: "text-rose",
  graphite: "text-graphite",
};
