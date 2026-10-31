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
  /** Chip name reported by esptool-js, e.g. "ESP32-C6". */
  chip: string;
  /** Optional MAC for logging/telemetry only; never trusted. */
  mac?: string;
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
    baudrate: number;
    parts: FlashSessionPart[];
  };
}

export interface FlashApiError {
  error: string;
  code:
    | "bad-request"
    | "forbidden"
    | "not-found"
    | "incompatible-chip"
    | "token-invalid"
    | "token-expired"
    | "rate-limited"
    | "server-error";
  /** Supported chip families when code === "incompatible-chip". */
  supported?: ChipFamily[];
}

/**
 * Normalises a chip name reported by esptool-js so it can be compared with a manifest's chipFamily.
 * esptool-js reports e.g. "ESP32-C6", "ESP32-S3", "ESP32", "ESP8266".
 */
export function normalizeChipName(chip: string): string {
  return chip.trim().toUpperCase().replace(/\s+/g, "");
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
}

/** Wire format of an encrypted part: 12-byte IV || ciphertext || 16-byte GCM tag. */
export const PART_IV_BYTES = 12;
export const PART_TAG_BYTES = 16;

export function partAad(nonce: string, index: number): string {
  return `${nonce}:${index}`;
}
