import "server-only";
import type { FirmwareManifest } from "@/lib/content/schema";
import { supportedChips, type FirmwarePublic } from "../shared";
import { partSize } from "./store";

/** Strips file names/offsets from a manifest and attaches image sizes for display. */
export async function toFirmwarePublic(m: FirmwareManifest): Promise<FirmwarePublic> {
  const sizes: FirmwarePublic["sizes"] = {};
  for (const build of m.builds) {
    let total = 0;
    for (const part of build.parts) {
      try {
        total += await partSize(m, part);
      } catch {
        total = 0;
        break;
      }
    }
    if (total > 0) sizes[build.chipFamily] = total;
  }
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    project: m.project,
    summary: m.summary,
    status: m.status,
    releasedAt: m.releasedAt,
    changelog: m.changelog,
    afterFlash: m.afterFlash,
    tags: m.tags,
    chips: supportedChips(m),
    sizes,
    demo: m.demo,
    forceErase: m.builds.every((b) => b.eraseAll),
    license: m.license,
    source: m.source,
    minFlashMB: m.minFlashMB,
    pairing: m.pairing,
  };
}
