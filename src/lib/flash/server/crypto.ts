import "server-only";
import { createCipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { FLASH_SESSION_TTL_MS, PART_IV_BYTES, partAad } from "../shared";

/**
 * Server secret used to sign session tokens and derive per-session keys.
 * Set FLASH_SECRET (>= 32 random bytes, hex or base64) in production. Without it a
 * random secret is generated per process, which is fine for a single `next start`
 * but breaks sessions across serverless instances.
 */
function loadSecret(): Buffer {
  const fromEnv = process.env.FLASH_SECRET?.trim();
  if (fromEnv) {
    const buf = /^[0-9a-fA-F]{64,}$/.test(fromEnv) ? Buffer.from(fromEnv, "hex") : Buffer.from(fromEnv, "base64");
    if (buf.length >= 32) return buf;
    throw new Error("FLASH_SECRET phải có ít nhất 32 byte (64 ký tự hex hoặc base64 tương ứng).");
  }
  const g = globalThis as unknown as { __flashSecret?: Buffer };
  if (!g.__flashSecret) {
    g.__flashSecret = randomBytes(32);
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[flash] FLASH_SECRET chưa được cấu hình — đang dùng khoá ngẫu nhiên theo tiến trình. " +
          "Hãy đặt FLASH_SECRET trong môi trường production.",
      );
    }
  }
  return g.__flashSecret;
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
