import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { FlashApiError, FlashApiErrorCode } from "../shared";

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

export function apiError(status: number, code: FlashApiErrorCode, message: string, extra?: Partial<FlashApiError>) {
  return NextResponse.json<FlashApiError>({ error: message, code, ...extra }, { status, headers: noStore() });
}

export function noStore(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Cross-Origin-Resource-Policy": "same-origin",
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

function clientKey(req: NextRequest): string {
  // Behind a reverse proxy the first X-Forwarded-For entry is the client. Without a proxy the
  // header is absent and all callers share one bucket, which is fine for a best-effort limiter.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimit(req: NextRequest, scope: string, limit: number): NextResponse<FlashApiError> | null {
  const key = `${scope}:${clientKey(req)}`;
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
    return apiError(429, "rate-limited", "Bạn thao tác quá nhanh, vui lòng thử lại sau một phút.");
  }
  return null;
}

/* ---------- single-use ledger: each (session nonce, part index) is served once ---------- */

const ledger = new Map<string, number>();

/** Returns false when this part was already served for this session. Entries expire with the token. */
export function consumeOnce(nonce: string, index: number, expiresAt: number): boolean {
  const now = Date.now();
  if (ledger.size > 20_000) {
    for (const [k, exp] of ledger) if (exp <= now) ledger.delete(k);
  }
  const key = `${nonce}:${index}`;
  if (ledger.has(key)) return false;
  ledger.set(key, expiresAt);
  return true;
}

/** Reads a bearer token from the Authorization header (tokens never travel in the URL). */
export function bearerToken(req: NextRequest): string {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+([A-Za-z0-9_.-]+)$/.exec(h);
  return m ? m[1] : "";
}
