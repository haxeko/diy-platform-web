import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { FLASH_SESSION_TTL_MS, PART_IV_BYTES, partAad } from "../shared";

const isProd = process.env.NODE_ENV === "production";

function parseKey(name: string, raw: string): Buffer {
  const v = raw.trim();
  const buf = /^[0-9a-fA-F]{64,}$/.test(v) ? Buffer.from(v, "hex") : Buffer.from(v, "base64");
  if (buf.length < 32) {
    throw new Error(`${name} phải có ít nhất 32 byte (64 ký tự hex hoặc chuỗi base64 tương ứng). Tạo bằng: openssl rand -hex 32`);
  }
  return buf;
}

/**
 * Server secret used to sign session tokens and derive per-session keys.
 * Required in production (fail-fast). In development a random per-process
 * secret is generated so `npm run dev` works without configuration.
 */
function loadSecret(): Buffer {
  const fromEnv = process.env.FLASH_SECRET;
  if (fromEnv && fromEnv.trim()) return parseKey("FLASH_SECRET", fromEnv);
  if (isProd) {
    throw new Error("FLASH_SECRET chưa được cấu hình. Biến này bắt buộc ở production (openssl rand -hex 32).");
  }
  const g = globalThis as unknown as { __flashSecret?: Buffer; __flashSecretWarned?: boolean };
  if (!g.__flashSecret) {
    g.__flashSecret = randomBytes(32);
    if (!g.__flashSecretWarned) {
      g.__flashSecretWarned = true;
      console.warn("[flash] FLASH_SECRET chưa đặt — dùng khoá ngẫu nhiên theo tiến trình (chỉ dành cho phát triển).");
    }
  }
  return g.__flashSecret;
}

/** Optional master key for firmware encrypted at rest (`*.bin.enc`). */
export function loadMasterKey(): Buffer | null {
  const fromEnv = process.env.FIRMWARE_MASTER_KEY;
  if (!fromEnv || !fromEnv.trim()) return null;
  return parseKey("FIRMWARE_MASTER_KEY", fromEnv);
}

export interface SessionTokenPayload {
  /** firmware id */
  fw: string;
  /** firmware version (pins the exact directory) */
  v: string;
  /** build index inside the manifest */
  b: number;
  /** expiry, unix ms */
  exp: number;
  /** random nonce (hex) — salts the per-session key and the AAD */
  n: string;
}

const b64url = {
  encode: (buf: Buffer | string) => Buffer.from(buf).toString("base64url"),
  decode: (s: string) => Buffer.from(s, "base64url"),
};

function sign(data: string): Buffer {
  return createHmac("sha256", loadSecret()).update(data).digest();
}

export function issueSessionToken(input: Omit<SessionTokenPayload, "exp" | "n">): {
  token: string;
  payload: SessionTokenPayload;
} {
  const payload: SessionTokenPayload = {
    ...input,
    exp: Date.now() + FLASH_SESSION_TTL_MS,
    n: randomBytes(16).toString("hex"),
  };
  const body = b64url.encode(JSON.stringify(payload));
  const sig = b64url.encode(sign(body));
  return { token: `${body}.${sig}`, payload };
}

export type TokenVerification =
  | { ok: true; payload: SessionTokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

export function verifySessionToken(token: string): TokenVerification {
  if (typeof token !== "string" || token.length > 2048) return { ok: false, reason: "invalid" };
  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false, reason: "invalid" };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(sig)) return { ok: false, reason: "invalid" };
  const expected = sign(body);
  const given = b64url.decode(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "invalid" };
  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(b64url.decode(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.fw !== "string" ||
    typeof payload.v !== "string" ||
    typeof payload.b !== "number" ||
    !Number.isInteger(payload.b) ||
    payload.b < 0 ||
    typeof payload.exp !== "number" ||
    typeof payload.n !== "string" ||
    !/^[0-9a-f]{32}$/.test(payload.n)
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

/** Per-session AES-256-GCM key derived from the server secret and the token nonce. */
export function deriveSessionKey(nonce: string): Buffer {
  const key = hkdfSync("sha256", loadSecret(), Buffer.from(nonce, "hex"), "diy-platform-web/flash/session-key/v1", 32);
  return Buffer.from(key);
}

/**
 * Encrypts one firmware part for the browser. Output: IV || ciphertext || tag.
 * The AAD binds the ciphertext to the session nonce and part index so parts
 * cannot be swapped between sessions.
 */
export function encryptPart(plain: Uint8Array, key: Buffer, nonce: string, index: number): Buffer {
  const iv = randomBytes(PART_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(partAad(nonce, index), "utf8"));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

/* ---------- at-rest encryption of stored firmware (`*.bin.enc`) ---------- */

/** File format: "MNFE" || version(1) || IV(12) || ciphertext || tag(16); AAD = "<id>/<version>/<file>". */
export const AT_REST_MAGIC = Buffer.from("MNFE", "ascii");
export const AT_REST_VERSION = 1;
export const AT_REST_HEADER_BYTES = AT_REST_MAGIC.length + 1 + PART_IV_BYTES;
export const AT_REST_TAG_BYTES = 16;

export function atRestAad(id: string, version: string, file: string): string {
  return `${id}/${version}/${file}`;
}

export function decryptAtRest(data: Buffer, aad: string): Buffer {
  const key = loadMasterKey();
  if (!key) throw new Error("Firmware được mã hoá at-rest nhưng FIRMWARE_MASTER_KEY chưa được cấu hình.");
  if (data.length < AT_REST_HEADER_BYTES + AT_REST_TAG_BYTES || !data.subarray(0, 4).equals(AT_REST_MAGIC)) {
    throw new Error("File .enc không đúng định dạng MNFE.");
  }
  if (data[4] !== AT_REST_VERSION) throw new Error(`Phiên bản định dạng .enc không hỗ trợ: ${data[4]}`);
  const iv = data.subarray(5, AT_REST_HEADER_BYTES);
  const tag = data.subarray(data.length - AT_REST_TAG_BYTES);
  const ct = data.subarray(AT_REST_HEADER_BYTES, data.length - AT_REST_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
