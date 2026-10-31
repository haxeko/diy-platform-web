import type { NextRequest } from "next/server";
import { getFirmware } from "@/lib/content/load";
import { deriveSessionKey, encryptPart, verifySessionToken } from "@/lib/flash/server/crypto";
import { readPart } from "@/lib/flash/server/store";
import { apiError, noStore, rateLimit, rejectIfNotSameOriginFetch } from "@/lib/flash/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/flash/part?t=<session token>&i=<part index>
 * Streams one firmware part, AES-256-GCM encrypted with the session key.
 * Wire format: 12-byte IV || ciphertext || 16-byte tag. Never cacheable,
 * never an attachment, never served to a top-level navigation.
 */
export async function GET(req: NextRequest) {
  const blocked = rejectIfNotSameOriginFetch(req) ?? rateLimit(req, "part", 120);
  if (blocked) return blocked;

  const token = req.nextUrl.searchParams.get("t") ?? "";
  const indexRaw = req.nextUrl.searchParams.get("i") ?? "";
  if (!/^\d{1,2}$/.test(indexRaw)) return apiError(400, "bad-request", "Chỉ số phần không hợp lệ.");
  const index = Number(indexRaw);

  const verified = verifySessionToken(token);
  if (!verified.ok) {
    return verified.reason === "expired"
      ? apiError(410, "token-expired", "Phiên flash đã hết hạn. Hãy kết nối lại thiết bị.")
      : apiError(403, "token-invalid", "Phiên flash không hợp lệ.");
  }
  const { fw, v, b, n } = verified.payload;

  const manifest = await getFirmware(fw);
  if (!manifest || manifest.version !== v) return apiError(404, "not-found", "Firmware không còn tồn tại.");
  const build = manifest.builds[b];
  const part = build?.parts[index];
  if (!build || !part) return apiError(404, "not-found", "Không tìm thấy phần firmware.");

  let plain: Uint8Array;
  try {
    plain = await readPart(manifest, part);
  } catch (err) {
    console.error(`[flash] không đọc được ${manifest.id}@${manifest.version}/${part.file}:`, err);
    return apiError(500, "server-error", "Không đọc được firmware trên máy chủ.");
  }

  const encrypted = encryptPart(plain, deriveSessionKey(n), n, index);
  plain.fill(0);

  return new Response(new Uint8Array(encrypted), {
    status: 200,
    headers: noStore({
      "Content-Type": "application/octet-stream",
      "Content-Length": String(encrypted.byteLength),
      "Content-Disposition": "inline",
      "X-Flash-Part": String(index),
    }),
  });
}
