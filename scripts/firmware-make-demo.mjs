#!/usr/bin/env node
/**
 * Creates placeholder binaries for every part referenced by content/firmware/*.json
 * manifests marked `"demo": true` that does not exist yet under firmware/<id>/<version>/.
 *
 * The placeholders are NOT bootable images: they start with 0xFF padding and a
 * plain-text marker so nobody mistakes them for real firmware. Manifests with
 * `"demo": false` are skipped on purpose — real firmware must be added with
 * `npm run firmware:add`.
 *
 * Usage: npm run firmware:demo
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestsDir = path.join(root, "content", "firmware");
const storeDir = path.join(root, "firmware");

const SIZES = { bootloader: 20 * 1024, "partition-table": 3 * 1024, app: 96 * 1024, default: 32 * 1024 };

function sizeFor(label, file) {
  const key = (label ?? file ?? "").toLowerCase();
  if (key.includes("boot")) return SIZES.bootloader;
  if (key.includes("partition")) return SIZES["partition-table"];
  if (key.includes("app") || key.includes("firmware") || key.endsWith(".bin")) return SIZES.app;
  return SIZES.default;
}

function placeholder(size, meta) {
  const buf = Buffer.alloc(size, 0xff);
  const text = Buffer.from(
    `\n\nDEMO PLACEHOLDER — NOT A REAL FIRMWARE IMAGE\n${JSON.stringify(meta)}\nReplace this file with your real build artefact.\n\n`,
    "utf8",
  );
  text.copy(buf, 16, 0, Math.min(text.length, size - 16));
  return buf;
}

let created = 0;
let skipped = 0;
const files = (await fs.readdir(manifestsDir).catch(() => [])).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const manifest = JSON.parse(await fs.readFile(path.join(manifestsDir, file), "utf8"));
  if (manifest.demo !== true) {
    skipped += 1;
    continue;
  }
  for (const build of manifest.builds ?? []) {
    for (const part of build.parts ?? []) {
      const dir = path.join(storeDir, manifest.id, manifest.version);
      const target = path.join(dir, part.file);
      const exists = await fs.access(target).then(() => true, () => false);
      const existsEnc = await fs.access(`${target}.enc`).then(() => true, () => false);
      if (exists || existsEnc) continue;
      await fs.mkdir(dir, { recursive: true });
      const size = sizeFor(part.label, part.file);
      await fs.writeFile(
        target,
        placeholder(size, { firmware: manifest.id, version: manifest.version, chip: build.chipFamily, part: part.label ?? part.file }),
      );
      created += 1;
      console.log(`+ ${path.relative(root, target)} (${size} B)`);
    }
  }
}
console.log(created ? `Đã tạo ${created} file demo.` : "Không thiếu file demo nào.");
if (skipped) console.log(`Bỏ qua ${skipped} manifest không phải demo (demo: false) — thêm firmware thật bằng npm run firmware:add.`);
