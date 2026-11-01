import type { NextRequest } from "next/server";
import { getFirmware } from "@/lib/content/load";
import { deriveSessionKey, encryptPart, verifySessionToken } from "@/lib/flash/server/crypto";
import { readPart } from "@/lib/flash/server/store";
import { apiError, bearerToken, consumeOnce, noStore, rateLimit, rejectIfNotSameOriginFetch } from "@/lib/flash/server/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/flash/part?i=<part index>   (Authorization: Bearer <session token>)
 * Streams one firmware part, AES-256-GCM encrypted with the session key.
 * Wire format: 12-byte IV || ciphertext || 16-byte tag. Each part is served
 * once per session, never cached, never an attachment, never to a navigation.
 */
export async function GET(req: NextRequest) {
  const blocked = rejectIfNotSameOriginFetch(req) ?? rateLimit(req, "part", 240);
  if (blocked) return blocked;

  const token = bearerToken(req);
  const indexRaw = req.nextUrl.searchParams.get("i") ?? "";
  if (!/^\d{1,2}$/.test(indexRaw)) return apiError(400, "bad-request", "Chỉ số phần không hợp lệ.");
  const index = Number(indexRaw);

  const verified = verifySessionToken(token);
  if (!verified.ok) {
    return verified.reason === "expired"
      ? apiError(410, "token-expired", "Phiên flash đã hết hạn. Hãy kết nối lại thiết bị.")
      : apiError(403, "token-invalid", "Phiên flash không hợp lệ.");
  }
  const { fw, v, b, n, exp } = verified.payload;

  const manifest = await getFirmware(fw);
  if (!manifest || manifest.version !== v) return apiError(404, "not-found", "Firmware không còn tồn tại.");
  const build = manifest.builds[b];
  const part = build?.parts[index];
  if (!build || !part) return apiError(404, "not-found", "Không tìm thấy phần firmware.");

  if (!consumeOnce(n, index, exp)) {
    return apiError(410, "token-consumed", "Phần firmware này đã được phát trong phiên. Hãy kết nối lại để nhận phiên mới.");
  }

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
