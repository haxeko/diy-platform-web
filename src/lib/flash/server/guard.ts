import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { FlashApiError } from "../shared";

/**
 * Cheap request hygiene for the firmware endpoints. None of this is a security
 * boundary against a determined user (the browser must receive the bytes to
 * flash them), but it stops casual grabbing: pasting the URL into the address
 * bar, curl, hotlinking from other sites, and brute-force enumeration.
 */
export function rejectIfNotSameOriginFetch(req: NextRequest): NextResponse<FlashApiError> | null {
  const site = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  const mode = req.headers.get("sec-fetch-mode");
  // Every browser that implements Web Serial also sends Sec-Fetch-* headers.
  if (!site || !dest) return apiError(403, "forbidden", "Yêu cầu không hợp lệ.");
  if (site !== "same-origin") return apiError(403, "forbidden", "Chỉ chấp nhận yêu cầu từ chính trang web.");
  // "document" = typed into the address bar / opened as a link → never serve bytes that way.
  if (dest !== "empty" || (mode && mode !== "cors" && mode !== "same-origin")) {
    return apiError(403, "forbidden", "Firmware chỉ được nạp trực tiếp vào thiết bị qua trình flash.");
  }
  return null;
}

export function apiError(status: number, code: FlashApiError["code"], message: string, extra?: Partial<FlashApiError>) {
  return NextResponse.json<FlashApiError>({ error: message, code, ...extra }, { status, headers: noStore() });
}

export function noStore(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    ...extra,
  };
}

/* ---------- best-effort in-memory rate limiter (per process) ---------- */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

export function rateLimit(req: NextRequest, scope: string, limit: number): NextResponse<FlashApiError> | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  if (b.count > limit) {
    return apiError(429, "rate-limited", "Bạn thao tác quá nhanh, vui lòng thử lại sau một phút.", undefined);
  }
  return null;
}
