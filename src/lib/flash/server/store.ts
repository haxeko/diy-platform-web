import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FirmwareBuild, FirmwareManifest } from "@/lib/content/schema";

/**
 * Firmware binaries live OUTSIDE /public so Next.js never serves them statically.
 * Layout: firmware/<firmwareId>/<version>/<file>
 */
export const FIRMWARE_STORE_DIR = path.join(process.cwd(), "firmware");

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function safeJoin(...segments: string[]): string {
  for (const s of segments) {
    if (!SAFE_SEGMENT.test(s) || s.includes("..")) throw new Error(`Đoạn đường dẫn không hợp lệ: ${s}`);
  }
  const full = path.join(FIRMWARE_STORE_DIR, ...segments);
  const rel = path.relative(FIRMWARE_STORE_DIR, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Đường dẫn vượt ra ngoài kho firmware");
  return full;
}

export function partPath(manifest: Pick<FirmwareManifest, "id" | "version">, part: FirmwareBuild["parts"][number]): string {
  return safeJoin(manifest.id, manifest.version, part.file);
}

export async function partSize(manifest: Pick<FirmwareManifest, "id" | "version">, part: FirmwareBuild["parts"][number]): Promise<number> {
  const st = await fs.stat(partPath(manifest, part));
  if (!st.isFile()) throw new Error("Không phải file");
  return st.size;
}

export async function readPart(manifest: Pick<FirmwareManifest, "id" | "version">, part: FirmwareBuild["parts"][number]): Promise<Uint8Array> {
  const buf = await fs.readFile(partPath(manifest, part));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** Returns which parts of a build are missing on disk (for diagnostics / build-time checks). */
export async function missingParts(manifest: Pick<FirmwareManifest, "id" | "version">, build: FirmwareBuild): Promise<string[]> {
  const missing: string[] = [];
  for (const part of build.parts) {
    try {
      await partSize(manifest, part);
    } catch {
      missing.push(part.file);
    }
  }
  return missing;
}
