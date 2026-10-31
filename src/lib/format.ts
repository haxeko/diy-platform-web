import type { Difficulty, GuideCategory, Protocol } from "@/lib/content/schema";

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateVi(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Nâng cao",
};

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}


export const GUIDE_CATEGORY_LABEL: Record<GuideCategory, string> = {
  "bat-dau": "Bắt đầu",
  flash: "Nạp firmware",
  matter: "Matter",
  thread: "Thread",
  "home-assistant": "Home Assistant",
  "phan-cung": "Phần cứng",
  "khac-phuc": "Khắc phục lỗi",
};

export const PROTOCOL_TONE: Record<Protocol, "mint" | "sky" | "lavender" | "peach" | "lemon" | "rose" | "graphite"> = {
  "Matter over Thread": "mint",
  "Matter over Wi-Fi": "sky",
  Thread: "lavender",
  Zigbee: "lemon",
  "Wi-Fi": "sky",
  BLE: "peach",
  "ESP-NOW": "graphite",
};

/** Shortens long wallet addresses for narrow screens: 0x1234…abcd */
export function truncateMiddle(s: string, head = 10, tail = 8): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
