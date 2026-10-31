import { NextResponse, type NextRequest } from "next/server";
import { getFirmware } from "@/lib/content/load";
import { issueSessionToken, deriveSessionKey } from "@/lib/flash/server/crypto";
import { partSize } from "@/lib/flash/server/store";
import { apiError, noStore, rateLimit, rejectIfNotSameOriginFetch } from "@/lib/flash/server/guard";
import {
  FLASH_SESSION_MAX_BODY,
  findBuildForChip,
  supportedChips,
  type FlashSessionRequest,
  type FlashSessionResponse,
} from "@/lib/flash/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/flash/session
 * Body: { firmwareId, chip, mac? }
 * Issues a short-lived, signed session for exactly one firmware build that
 * matches the chip the browser detected. The response carries the one-time
 * AES-GCM key used to decrypt the parts served by /api/flash/part.
 */
export async function POST(req: NextRequest) {
  const blocked = rejectIfNotSameOriginFetch(req) ?? rateLimit(req, "session", 30);
  if (blocked) return blocked;

  const lenHeader = Number(req.headers.get("content-length") ?? "0");
  if (lenHeader > FLASH_SESSION_MAX_BODY) return apiError(413, "bad-request", "Yêu cầu quá lớn.");

  let body: Partial<FlashSessionRequest>;
  try {
    const text = await req.text();
    if (text.length > FLASH_SESSION_MAX_BODY) return apiError(413, "bad-request", "Yêu cầu quá lớn.");
    body = JSON.parse(text);
  } catch {
    return apiError(400, "bad-request", "Nội dung yêu cầu không phải JSON hợp lệ.");
  }

  const firmwareId = typeof body.firmwareId === "string" ? body.firmwareId : "";
  const chip = typeof body.chip === "string" ? body.chip : "";
  if (!firmwareId || !chip || chip.length > 32) return apiError(400, "bad-request", "Thiếu firmwareId hoặc chip.");

  const manifest = await getFirmware(firmwareId);
  if (!manifest || manifest.status === "deprecated") return apiError(404, "not-found", "Không tìm thấy firmware.");

  const buildIndex = manifest.builds.findIndex((b) => b === findBuildForChip(manifest.builds, chip));
  if (buildIndex < 0) {
    return apiError(409, "incompatible-chip", `Firmware này không có bản dựng cho ${chip}.`, {
      supported: supportedChips(manifest),
    });
  }
  const build = manifest.builds[buildIndex];

  let parts: FlashSessionResponse["build"]["parts"];
  try {
    parts = await Promise.all(
      build.parts.map(async (p, index) => ({
        index,
        offset: p.offset,
        size: await partSize(manifest, p),
        label: p.label,
      })),
    );
  } catch (err) {
    console.error(`[flash] thiếu file firmware cho ${manifest.id}@${manifest.version}:`, err);
    return apiError(500, "server-error", "Firmware chưa sẵn sàng trên máy chủ. Vui lòng thử lại sau.");
  }

  const { token, payload } = issueSessionToken({ fw: manifest.id, v: manifest.version, b: buildIndex });
  const key = deriveSessionKey(payload.n);

  const res: FlashSessionResponse = {
    token,
    key: key.toString("base64"),
    expiresAt: payload.exp,
    chip: build.chipFamily,
    firmware: { id: manifest.id, name: manifest.name, version: manifest.version },
    build: {
      chipFamily: build.chipFamily,
      flashMode: build.flashMode,
      flashFreq: build.flashFreq,
      flashSize: build.flashSize,
      eraseAll: build.eraseAll,
      baudrate: build.baudrate,
      parts,
    },
  };
  return NextResponse.json(res, { headers: noStore() });
}
