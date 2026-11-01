/**
 * Types shared by the flash API (server) and the in-browser flasher (client).
 * Nothing in this file may import Node-only modules.
 */
import type { ChipFamily, FirmwareManifest } from "@/lib/content/schema";

/** Session lifetime. Parts are fetched up-front, so a few minutes is plenty. */
export const FLASH_SESSION_TTL_MS = 10 * 60 * 1000;
/** Max body size accepted by POST /api/flash/session. */
export const FLASH_SESSION_MAX_BODY = 2048;

export interface FlashSessionRequest {
  firmwareId: string;
  /** Chip family reported by esptool-js (`loader.chip.CHIP_NAME`), e.g. "ESP32-C6". */
  chip: string;
}

export interface FlashSessionPart {
  index: number;
  offset: number;
  /** Plaintext size in bytes (used for progress + sanity checks). */
  size: number;
  label?: string;
}

export interface FlashSessionResponse {
  token: string;
  /** base64 AES-256-GCM key, valid only for this session. */
  key: string;
  expiresAt: number;
  chip: ChipFamily;
  firmware: { id: string; name: string; version: string };
  build: {
    chipFamily: ChipFamily;
    flashMode: FirmwareManifest["builds"][number]["flashMode"];
    flashFreq: FirmwareManifest["builds"][number]["flashFreq"];
    flashSize: FirmwareManifest["builds"][number]["flashSize"];
    eraseAll: boolean;
    parts: FlashSessionPart[];
  };
}

export type FlashApiErrorCode =
  | "bad-request"
  | "forbidden"
  | "not-found"
  | "incompatible-chip"
  | "token-invalid"
  | "token-expired"
  | "token-consumed"
  | "demo-disabled"
  | "integrity-failed"
  | "rate-limited"
  | "server-error";

export interface FlashApiError {
  error: string;
  code: FlashApiErrorCode;
  /** Supported chip families when code === "incompatible-chip". */
  supported?: ChipFamily[];
}

/**
 * Normalises a chip name so it can be compared with a manifest's chipFamily.
 * Accepts the bare family ("ESP32-C6") as well as esptool-js descriptions
 * such as "ESP32-C6 (QFN40) (revision v0.1)" or "ESP32-D0WD-V3 (revision v3.1)".
 */
export function normalizeChipName(chip: string): string {
  const head = chip.trim().toUpperCase().split(/[\s(]/)[0] ?? "";
  // Classic ESP32 variants: ESP32-D0WD, ESP32-D0WDQ6, ESP32-PICO-D4, ESP32-U4WDH … → "ESP32"
  if (/^ESP32-(D0|D2|PICO|U4|S0)/.test(head)) return "ESP32";
  return head;
}

export function findBuildForChip<T extends { chipFamily: ChipFamily }>(builds: readonly T[], chip: string): T | undefined {
  const wanted = normalizeChipName(chip);
  return builds.find((b) => normalizeChipName(b.chipFamily) === wanted);
}

export function supportedChips(manifest: Pick<FirmwareManifest, "builds">): ChipFamily[] {
  return Array.from(new Set(manifest.builds.map((b) => b.chipFamily)));
}

/** The public, non-sensitive subset of a manifest that is safe to ship to the client. */
export interface FirmwarePublic {
  id: string;
  name: string;
  version: string;
  project: string;
  summary: string;
  status: FirmwareManifest["status"];
  releasedAt: string;
  changelog: string[];
  afterFlash: string[];
  tags: string[];
  chips: ChipFamily[];
  /** Approximate total image size per chip family, in bytes (for the UI). */
  sizes: Partial<Record<ChipFamily, number>>;
  demo: boolean;
  /** True when every build (or the only build) requires a full erase. */
  forceErase: boolean;
  license?: string;
  source?: string;
  minFlashMB?: number;
  pairing?: { qr?: string; manualCode?: string };
}

/** Wire format of an encrypted part: 12-byte IV || ciphertext || 16-byte GCM tag. */
export const PART_IV_BYTES = 12;
export const PART_TAG_BYTES = 16;

export function partAad(nonce: string, index: number): string {
  return `${nonce}:${index}`;
}

/** Parses esptool-js flash size strings ("4MB", "512KB") to bytes; undefined if unknown. */
export function flashSizeToBytes(size: string | undefined): number | undefined {
  if (!size) return undefined;
  const m = /^(\d+)(KB|MB)$/i.exec(size.trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2].toUpperCase() === "MB" ? n * 1024 * 1024 : n * 1024;
}
