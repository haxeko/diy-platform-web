import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FirmwareBuild, FirmwareManifest } from "@/lib/content/schema";
import { AT_REST_HEADER_BYTES, AT_REST_TAG_BYTES, atRestAad, decryptAtRest } from "./crypto";

/**
 * Firmware binaries live OUTSIDE /public so Next.js never serves them statically.
 * Layout: firmware/<firmwareId>/<version>/<file>            (plain)
 *         firmware/<firmwareId>/<version>/<file>.enc        (encrypted at rest with FIRMWARE_MASTER_KEY)
 * The encrypted variant wins when both exist.
 */
export const FIRMWARE_STORE_DIR = path.join(process.cwd(), "firmware");

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
type ManifestRef = Pick<FirmwareManifest, "id" | "version">;
type Part = FirmwareBuild["parts"][number];

function safeJoin(...segments: string[]): string {
  for (const s of segments) {
    if (!SAFE_SEGMENT.test(s) || s.includes("..")) throw new Error(`Đoạn đường dẫn không hợp lệ: ${s}`);
  }
  const full = path.join(FIRMWARE_STORE_DIR, ...segments);
  const rel = path.relative(FIRMWARE_STORE_DIR, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Đường dẫn vượt ra ngoài kho firmware");
  return full;
}

interface ResolvedPart {
  path: string;
  encrypted: boolean;
  size: number;
  mtimeMs: number;
}

async function resolvePart(m: ManifestRef, part: Part): Promise<ResolvedPart> {
  const enc = safeJoin(m.id, m.version, `${part.file}.enc`);
  try {
    const st = await fs.stat(enc);
    if (st.isFile()) {
      const size = st.size - AT_REST_HEADER_BYTES - AT_REST_TAG_BYTES;
      if (size <= 0) throw new Error(`File mã hoá quá ngắn: ${part.file}.enc`);
      return { path: enc, encrypted: true, size, mtimeMs: st.mtimeMs };
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const plain = safeJoin(m.id, m.version, part.file);
  const st = await fs.stat(plain);
  if (!st.isFile()) throw new Error("Không phải file");
  return { path: plain, encrypted: false, size: st.size, mtimeMs: st.mtimeMs };
}

export async function partSize(m: ManifestRef, part: Part): Promise<number> {
  return (await resolvePart(m, part)).size;
}

export async function partIsEncrypted(m: ManifestRef, part: Part): Promise<boolean> {
  return (await resolvePart(m, part)).encrypted;
}

export async function readPart(m: ManifestRef, part: Part): Promise<Uint8Array> {
  const r = await resolvePart(m, part);
  const raw = await fs.readFile(r.path);
  const buf = r.encrypted ? decryptAtRest(raw, atRestAad(m.id, m.version, part.file)) : raw;
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/* ---------- integrity: optional sha256 declared in the manifest ---------- */

const shaCache = new Map<string, { mtimeMs: number; sha256: string }>();

/** Returns true when the part has no declared sha256 or the file matches it. Throws on I/O errors. */
export async function verifyPartIntegrity(m: ManifestRef, part: Part): Promise<boolean> {
  if (!part.sha256) return true;
  const r = await resolvePart(m, part);
  const cached = shaCache.get(r.path);
  if (cached && cached.mtimeMs === r.mtimeMs) return cached.sha256 === part.sha256;
  const data = await readPart(m, part);
  const sha256 = createHash("sha256").update(data).digest("hex");
  shaCache.set(r.path, { mtimeMs: r.mtimeMs, sha256 });
  return sha256 === part.sha256;
}

/** Returns which parts of a build are missing on disk (for diagnostics / build-time checks). */
export async function missingParts(m: ManifestRef, build: FirmwareBuild): Promise<string[]> {
  const missing: string[] = [];
  for (const part of build.parts) {
    try {
      await partSize(m, part);
    } catch {
      missing.push(part.file);
    }
  }
  return missing;
}
